import exposeContexts from "./helpers/ipc/context-exposer";

console.log("Preload script started");
exposeContexts();
console.log("Contexts exposed");

// Debug: Check if projectAPI is available
setTimeout(() => {
  console.log("Checking projectAPI availability:", typeof (window as any).projectAPI);
  if ((window as any).projectAPI) {
    console.log("projectAPI methods:", Object.keys((window as any).projectAPI));
  }
}, 100);
