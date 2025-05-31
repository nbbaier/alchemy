import { test } from "bun:test";
import { DispatchNamespace } from "../../src/cloudflare/dispatch-namespace.js";
import { Worker } from "../../src/cloudflare/worker.js";

test("dispatch namespace", async () => {
  const namespace = await DispatchNamespace("test-dispatch-namespace", {
    namespace: "test-dispatch-namespace",
  });

  console.log("Created dispatch namespace:", namespace.id);
  console.log("Namespace name:", namespace.namespace);
  console.log("Namespace type:", namespace.type);

  const dispatcher = await Worker("test-dispatcher", {
    script: `
      export default {
        async fetch(request, env) {
          const url = new URL(request.url);
          const userWorkerName = url.pathname.split('/')[1];
          
          if (userWorkerName && env.NAMESPACE) {
            return env.NAMESPACE.get(userWorkerName).fetch(request);
          }
          
          return new Response('Dispatcher worker running', { status: 200 });
        }
      }
    `,
    bindings: {
      NAMESPACE: namespace,
    },
  });

  console.log("Created dispatcher worker:", dispatcher.id);

  const userWorker = await Worker("test-user-worker", {
    script: `
      export default {
        async fetch(request) {
          return new Response('Hello from user worker in dispatch namespace!', { 
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          });
        }
      }
    `,
    namespace: namespace,
  });

  console.log("Created user worker in dispatch namespace:", userWorker.id);

  console.log("User worker dispatch namespace:", userWorker.namespace);
});

test("dispatch namespace with string", async () => {
  const userWorker = await Worker("test-string-dispatch-worker", {
    script: `
      export default {
        async fetch(request) {
          return new Response('Hello from string dispatch namespace worker!', { 
            status: 200 
          });
        }
      }
    `,
    namespace: "string-namespace",
  });

  console.log("Created worker with string dispatch namespace:", userWorker.id);
  console.log("String dispatch namespace:", userWorker.namespace);
});

test("dispatch namespace adoption", async () => {
  const namespace1 = await DispatchNamespace("adopt-test-namespace", {
    namespace: "adopt-test-namespace",
  });

  console.log("Created first namespace:", namespace1.id);

  const namespace2 = await DispatchNamespace("adopt-test-namespace-2", {
    namespace: "adopt-test-namespace",
    adopt: true,
  });

  console.log("Adopted namespace:", namespace2.id);
  console.log(
    "Namespace names match:",
    namespace1.namespace === namespace2.namespace,
  );
});
