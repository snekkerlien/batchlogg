export function translateOldRecipe(batch: any) {
  if (!batch || !batch.oppskrift) return batch;

  if (batch.full_process || batch.additives || batch.notes) return batch;

  const text: string = batch.oppskrift;

  const getSection = (label: string): string => {
    const parts = text.split(label + ":");
    if (parts.length < 2) return "";
    return parts[1]
      .split(/(Ingredients:|Full process:|Notes:)/)[0]
      .trim();
  };

  const ingredients: string = getSection("Ingredients");
  const fullProcess: string = getSection("Full process");
  const notes: string = getSection("Notes");

  if (batch.type === "Mead") {
    batch.honey_type = batch.honey_type || "";
    batch.honey_amount = batch.honey_amount || "";
    batch.additives = batch.additives || "";
    batch.full_process = fullProcess;
    batch.notes = notes;
    batch.fruits = batch.fruits || [];
  }

  if (batch.type === "Wine") {
    batch.juice_type = batch.juice_type || "";
    batch.sugar_amount = batch.sugar_amount || "";
    batch.additives = batch.additives || "";
    batch.full_process = fullProcess;
    batch.notes = notes;

    batch.ingredients =
      ingredients
        ?.split(",")
        .map((i: string) => ({
          name: i.trim(),
          amount: "",
          unit: "",
        })) || [];
  }

  if (batch.type === "Cider") {
    batch.juice_type = batch.juice_type || "";
    batch.sugar_amount = batch.sugar_amount || "";
    batch.additives = batch.additives || "";
    batch.full_process = fullProcess;
    batch.notes = notes;
  }

  if (batch.type === "Beer") {
    batch.malts = batch.malts || [];
    batch.hops = batch.hops || [];
    batch.boil_time = batch.boil_time || "";
    batch.additives = batch.additives || "";
    batch.full_process = fullProcess;
    batch.notes = notes;
  }

  if (batch.type === "Braggot") {
    batch.malts = batch.malts || [];
    batch.honey_amount = batch.honey_amount || "";
    batch.boil_time = batch.boil_time || "";
    batch.additives = batch.additives || "";
    batch.full_process = fullProcess;
    batch.notes = notes;
  }

  if (batch.type === "Other") {
    batch.ingredients =
      ingredients
        ?.split(",")
        .map((i: string) => ({
          name: i.trim(),
          amount: "",
          unit: "",
        })) || [];

    batch.steps =
      fullProcess
        ?.split("\n")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0) || [];

    batch.additives = batch.additives || "";
    batch.notes = notes;
  }

  return batch;
}
