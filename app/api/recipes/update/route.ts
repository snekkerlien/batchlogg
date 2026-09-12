    import { NextResponse } from "next/server";
    import { cookies } from "next/headers";
    import { createServerClient } from "@supabase/ssr";
    import { calcIBU, calcDryHopIBU, calcEBC, calcDryHopEBC } from "@/app/recipes/actions/createRecipe";


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
    

    // ⭐ Normalize alpha (comma → dot)
    const normalizedHops = hops.map((h: any) => ({
        ...h,
        alpha: h.alpha ? Number(String(h.alpha).replace(",", ".")) : 0,
    }));

    fields.hops = normalizedHops;


    const ibuBoil = calcIBU(normalizedHops, og, boil_volume);
    const ibuDry = calcDryHopIBU(dry_hops);
    fields.ibu = ibuBoil + ibuDry;

    const ebcResult = calcEBC(malts, boil_volume);
    const ebcDry = calcDryHopEBC(dry_hops);
    fields.ebc = ebcResult.ebc + ebcDry;

    fields.malt_warnings = ebcResult.warnings;

    


    }

    // ⭐ Recalculate ABV
    if (fields.og && fields.fg) {
    const ogNum = Number(fields.og);
    const fgNum = Number(fields.fg);

    if (!isNaN(ogNum) && !isNaN(fgNum)) {
        fields.abv = (ogNum - fgNum) * 131.25;
    }
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
