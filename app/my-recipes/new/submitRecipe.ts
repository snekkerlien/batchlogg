import { createRecipe } from "../actions/createRecipe";

export async function submitRecipe(formData: FormData) {
  try {
    return await createRecipe(formData);
  } catch (error) {
    console.error("Could not create recipe", error);
    return { success: false, error: "Could not save the recipe." };
  }
}
