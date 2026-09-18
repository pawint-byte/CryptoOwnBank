import { p1 } from "./en.part1";
import { p2 } from "./en.part2";
import { p3 } from "./en.part3";

export const en = new Function("return (" + p1 + p2 + p3 + ")")() as any;
