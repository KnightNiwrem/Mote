import { serve } from "bun";
import { createServeOptions } from "./server";

const server = serve(createServeOptions());

console.log(`Bun local server running at ${server.url}`);
