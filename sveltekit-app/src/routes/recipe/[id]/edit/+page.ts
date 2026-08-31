// This route only ever reads user-created recipes, which live in
// localStorage and don't exist during server-side rendering. Rendering it
// client-only avoids a false "not found" flash before hydration corrects it.
export const ssr = false;
