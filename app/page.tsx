import { createBatch } from './actions/createBatch';

export default function Home() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Ny batch</h1>

      <form action={createBatch}>
        <input
          type="text"
          name="name"
          placeholder="Navn på batch"
          required
        />

        <input
          type="number"
          name="volume"
          placeholder="Volum (liter)"
          required
        />

        <input
          type="text"
          name="status"
          placeholder="Status"
          required
        />

        <button type="submit">Opprett batch</button>
      </form>
    </div>
  );
}