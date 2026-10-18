    import { NextResponse } from "next/server";
    import { cookies } from "next/headers";
    import { createServerClient } from "@supabase/ssr";
    import { calcIBU, calcDryHopIBU, calcEBC } from "@/lib/brewing/beerCalculators";
    import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
    import { hasPremiumAccess } from "@/lib/auth/plan";


    export const runtime = "nodejs";

    export async function POST(req: Request) {
    try {
        const cookieStore = cookies();

        const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
            get(name: string) {
                return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
                cookieStore.set({ name, value, ...options });
            },
            remove(name: string, options: any) {
                cookieStore.set({ name, value: "", ...options });
            },
            },
        }
        );

        

        const {
        data: { user },
        error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
        return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
        }

        const body = await req.json();
        const { id, ...fields } = body;
        const changeNote =
            typeof fields.changeNote === "string" ? fields.changeNote.trim() : null;
        delete fields.changeNote;
        const beerSubtype = fields.beer_subtype;
        const kitUrl = fields.kit_url;
        delete fields.beer_subtype;
        delete fields.kit_url;

        // ⭐ Parse JSON fields if needed
        const jsonFields = ["malts", "hops", "dry_hops", "fruits", "ingredients", "steps"];

        for (const key of jsonFields) {
        if (fields[key]) {
            try {
            fields[key] = JSON.parse(fields[key]);
            } catch {
            // ignore parse errors, leave as string
            }
        }
        }

        if (fields.type === "Beer" && beerSubtype !== undefined) {
        if (!["all_grain", "fresh_wort_kit", "malt_extract_kit"].includes(beerSubtype)) {
            return NextResponse.json({ error: "Invalid beer recipe style" }, { status: 400 });
        }
        if (
            beerSubtype !== "all_grain" &&
            (typeof fields.name !== "string" ||
                !fields.name.trim() ||
                typeof fields.yeast !== "string" ||
                !fields.yeast.trim() ||
                fields.og === undefined ||
                fields.og === null ||
                fields.og === "" ||
                !Number.isFinite(Number(fields.og)) ||
                fields.volume === undefined ||
                fields.volume === null ||
                fields.volume === "" ||
                !Number.isFinite(Number(fields.volume)) ||
                Number(fields.volume) <= 0)
        ) {
            return NextResponse.json({
                error: "Kit name, volume, OG, and yeast are required for kit recipes.",
            }, { status: 400 });
        }
        let normalizedKitUrl: string | null = null;
        if (beerSubtype !== "all_grain" && typeof kitUrl === "string" && kitUrl.trim()) {
            try {
                const parsedKitUrl = new URL(kitUrl.trim());
                if (parsedKitUrl.protocol !== "http:" && parsedKitUrl.protocol !== "https:") {
                    return NextResponse.json({ error: "Kit link must use http or https" }, { status: 400 });
                }
                normalizedKitUrl = parsedKitUrl.toString();
            } catch {
                return NextResponse.json({ error: "Invalid kit link" }, { status: 400 });
            }
        }
        fields.ingredients = {
            beer_subtype: beerSubtype,
            kit_url: normalizedKitUrl,
        };
        if (beerSubtype !== "all_grain") {
            fields.malts = [];
            fields.boil_time = null;
            fields.boil_volume = null;
            fields.fg = null;
            fields.abv = null;
            fields.hops = [];
        }
        }

        // ⭐ Convert numbers
        const numberFields = ["og", "fg", "abv", "volume", "boil_volume", "ibu", "ebc", "boil_time"];

    for (const key of numberFields) {
    if (fields[key] === "") {
        delete fields[key]; // ← kritisk fix
        continue;
    }

    if (fields[key] !== undefined && fields[key] !== null) {
        const num = Number(fields[key]);
        fields[key] = isNaN(num) ? undefined : num;
    }
    }



        // ⭐ Recalculate IBU/EBC for Beer/Braggot
    if (fields.type === "Beer" || fields.type === "Braggot") {
    const og = Number(fields.og) || 1.050;
    const volume = Number(fields.volume) || 20;
    const boil_volume = Number(fields.boil_volume) || volume;

    const hops = Array.isArray(fields.hops) ? fields.hops : [];
    const dry_hops = Array.isArray(fields.dry_hops) ? fields.dry_hops : [];
    const malts = Array.isArray(fields.malts) ? fields.malts : [];

    if (
        (fields.type === "Braggot" || beerSubtype === "all_grain") &&
        hops.some((hop: any) => {
            const hasAddition = [hop.name, hop.amount, hop.alpha, hop.year].some(
                (value) => value != null && String(value).trim() !== ""
            );
            if (!hasAddition) return false;
            if (hop.time == null || String(hop.time).trim() === "") return true;
            return hop.addition_type === "whirlpool" &&
                (!Number.isFinite(Number(hop.temperature)) ||
                    Number(hop.temperature) < 0 ||
                    Number(hop.temperature) > 100);
        })
    ) {
        return NextResponse.json({
            error: "Enter a time for every hop addition and a whirlpool temperature between 0 and 100°C.",
        }, { status: 400 });
    }
    

    // ⭐ Normalize alpha (comma → dot)
    const normalizedHops = hops.map((h: any) => ({
        ...h,
        alpha: h.alpha ? Number(String(h.alpha).replace(",", ".")) : 0,
    }));

    fields.hops = normalizedHops;

    const normalizedDryHops = dry_hops.map((hop: any) => {
        if (!hop || typeof hop !== "object" || Array.isArray(hop)) return hop;

        const alpha = hop.alpha == null || hop.alpha === ""
            ? null
            : Number(String(hop.alpha).replace(",", "."));
        const year = hop.year == null || hop.year === ""
            ? null
            : Number(hop.year);

        if (alpha !== null && (!Number.isFinite(alpha) || alpha < 0 || alpha > 100)) {
            return null;
        }
        if (year !== null && (!Number.isInteger(year) || year < 1900)) {
            return null;
        }

        return { ...hop, alpha, year };
    });

    if (normalizedDryHops.some((hop: any) => hop === null)) {
        return NextResponse.json({
            error: "Dry hop alpha must be between 0 and 100%, and crop year must be a valid year.",
        }, { status: 400 });
    }
    fields.dry_hops = normalizedDryHops;

    if (fields.type === "Beer" && beerSubtype === "fresh_wort_kit") {
        if (
            !Number.isFinite(Number(fields.ibu)) ||
            fields.ibu === undefined ||
            fields.ibu === null ||
            fields.ibu === "" ||
            Number(fields.ibu) < 0 ||
            !Number.isFinite(Number(fields.ebc)) ||
            fields.ebc === undefined ||
            fields.ebc === null ||
            fields.ebc === "" ||
            Number(fields.ebc) < 0
        ) {
            return NextResponse.json({
                error: "Enter the IBU and EBC values shown on the fresh wort kit.",
            }, { status: 400 });
        }
    } else {
        const ibuBoil = calcIBU(normalizedHops, og, volume, boil_volume);
        const ibuDry = calcDryHopIBU(normalizedDryHops, volume);
        fields.ibu = ibuBoil + ibuDry;

        const hasCompleteMaltColorData = malts.length === 0 || malts.every((malt: any) => {
            if (
                !malt ||
                typeof malt !== "object" ||
                Array.isArray(malt) ||
                malt.ebc == null ||
                malt.ebc === "" ||
                malt.amount == null ||
                malt.amount === ""
            ) {
                return false;
            }
            const ebc = Number(String(malt.ebc).replace(",", "."));
            const amount = Number(String(malt.amount).replace(",", "."));
            return Number.isFinite(ebc) && ebc >= 0 && Number.isFinite(amount) && amount >= 0;
        });
        const ebcResult = calcEBC(malts, volume);
        if (hasCompleteMaltColorData) {
            fields.ebc = ebcResult.ebc;
        }
        fields.malt_warnings = ebcResult.warnings;
    }

    


    }

    // ⭐ Recalculate ABV
    if (fields.og && fields.fg) {
    const ogNum = Number(fields.og);
    const fgNum = Number(fields.fg);

    if (!isNaN(ogNum) && !isNaN(fgNum)) {
        fields.abv = (ogNum - fgNum) * 131.25;
    }
    }
        const { data: previousRecipe, error: previousRecipeError } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
        if (previousRecipeError) {
            return NextResponse.json(
                { error: "Could not load the current recipe", details: previousRecipeError.message },
                { status: 500 }
            );
        }
        if (!previousRecipe) {
            return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
        }

        const { serviceRole } = supabaseServer();
        if (await hasPremiumAccess(serviceRole, user.id)) {
            const { data: latestVersion, error: versionLookupError } = await serviceRole
                .from("recipe_versions")
                .select("version_number")
                .eq("recipe_id", id)
                .order("version_number", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (versionLookupError) throw versionLookupError;

            const { error: versionInsertError } = await serviceRole
                .from("recipe_versions")
                .insert({
                    recipe_id: id,
                    user_id: user.id,
                    version_number: (latestVersion?.version_number ?? 0) + 1,
                    recipe_snapshot: previousRecipe,
                    change_note: changeNote || null,
                });
            if (versionInsertError) throw versionInsertError;
        }

        const { error } = await supabase
        .from("recipes")
        .update(fields)
        .eq("id", id)
        .eq("user_id", user.id); // ⭐ sikkerhet

        if (error) {
        return NextResponse.json(
            { error: "Kunne ikke oppdatere oppskriften", details: error.message },
            { status: 500 }
        );
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json(
        { error: "Serverfeil", details: err.message },
        { status: 500 }
        );
    }
    }
