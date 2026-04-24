import { type ElementType } from "react";

export function isReactComponent(value: unknown): value is ElementType {
    return (
        typeof value === "function" ||
        (typeof value === "object" && value !== null && "$$typeof" in value)
    );
}
