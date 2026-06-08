import { build as esbuild } from "esbuild";
import { rm, readFile } from "fs/promises";
import { spawn } from "child_process";

// Run a command as a child process, inheriting stdio, and reject on non-zero exit.
function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `${command} ${args.join(" ")} exited with code ${code}${signal ? ` (signal ${signal})` : ""}`,
          ),
        );
    });
  });
}

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  // Vite's in-process build runs out of heap on this large bundle (~7,600 modules),
  // so run it in its own process with a raised memory ceiling. The ceiling is
  // configurable so it can be tuned for the build environment's available RAM.
  const heapMb = process.env.VITE_MAX_OLD_SPACE_SIZE || "4096";
  await run(process.execPath, [
    `--max-old-space-size=${heapMb}`,
    "node_modules/vite/bin/vite.js",
    "build",
  ]);

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
