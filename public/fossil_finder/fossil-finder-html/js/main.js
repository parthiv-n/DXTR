import Game from "./game.js";

const game = new Game();

window.addEventListener("DOMContentLoaded", async () => {
  await game.init();

  document.getElementById("btn-encyclopedia").addEventListener("click", () => {
    game.openLevelSelect();
  });
});
