
function wait(ms) {
  return new Promise((r, j) => setTimeout(r, ms));
}

module.exports = wait;

