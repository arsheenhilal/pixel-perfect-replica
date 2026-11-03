import { useStore, type Shelf, type ShelfItem } from "./storage";

export function useShelf() {
  const [items, setItems] = useStore<ShelfItem[]>("shelf", []);
  const get = (key: string) => items.find((i) => i.key === key);
  const put = (item: Omit<ShelfItem, "addedAt" | "shelf">, shelf: Shelf) =>
    setItems((prev) => [{ ...item, shelf, addedAt: Date.now() }, ...prev.filter((i) => i.key !== item.key)]);
  const remove = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key));
  return { items, get, put, remove };
}
