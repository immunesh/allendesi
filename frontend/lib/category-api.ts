import { api } from "./api";

export async function getCategories() {
  const res = await api.get("/categories");
  return Array.isArray(res.data) ? res.data : res.data?.data || [];
}

export async function deleteCategory(id: string) {
  const res = await fetch(
    `http://localhost:5000/api/categories/${id}`,
    {
      method: "DELETE",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to delete category");
  }

  return res.json();
}