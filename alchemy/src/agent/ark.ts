import { type Schema, jsonSchema } from "ai";
import { ArkErrors, type type } from "arktype";

export function arkSchema<T extends type>(type: T): Schema<type.infer<T>> {
  return jsonSchema(type.toJsonSchema() as any, {
    validate: (value) => {
      const out = type(value) as type.infer<T> | type.errors;
      if (out instanceof ArkErrors) {
        return {
          success: false,
          error: new Error(out.summary),
        };
      }
      return {
        success: true,
        value: out,
      };
    },
  });
}
