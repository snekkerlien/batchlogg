// test.mjs – bruker innebygd fetch i Node 20/22/26

fetch("http://localhost:3001/brewcompanion", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: "hi" })
})
  .then(r => r.text())
  .then(console.log)
  .catch(console.error);
