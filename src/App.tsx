import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import "./index.css";

import logo from "./logo.svg";
import reactLogo from "./react.svg";

export function App() {
  return (
    <main className="container relative z-10 mx-auto max-w-3xl p-8 text-center">
      <div className="mb-8 flex items-center justify-center gap-8">
        <img
          src={logo}
          alt="Bun Logo"
          className="h-36 scale-120 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#646cffaa]"
        />
        <img
          src={reactLogo}
          alt="React Logo"
          className="h-36 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#61dafbaa] [animation:spin_20s_linear_infinite]"
        />
      </div>
      <Card>
        <CardHeader className="gap-4">
          <CardTitle className="text-3xl font-bold">
            Bun + React Static App
          </CardTitle>
          <CardDescription>
            Edit{" "}
            <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono">
              src/App.tsx
            </code>{" "}
            and save to test HMR
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 text-left sm:grid-cols-3">
          <div>
            <h2 className="font-semibold">Bun</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Local serving, package management, builds, and tests.
            </p>
          </div>
          <div>
            <h2 className="font-semibold">React 19</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Client UI with TypeScript and fast refresh.
            </p>
          </div>
          <div>
            <h2 className="font-semibold">Static Output</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Production assets are emitted to the dist directory.
            </p>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild variant="secondary">
            <a href="https://bun.sh/docs/bundler/html">Bun HTML builds</a>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

export default App;
