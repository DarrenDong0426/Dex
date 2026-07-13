import { importGameData } from "../action";

export default function uploadPage() {
  return (
    <form action={importGameData}>
      <input type="file" name="file" accept=".csv" />
      <button type="submit">Import</button>
    </form>
  );
}
