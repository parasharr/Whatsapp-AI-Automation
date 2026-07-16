import db from "./config/firebase.js";

await db.collection("test").add({
  hello: "world",
  time: new Date(),
});

console.log("Firebase Working");