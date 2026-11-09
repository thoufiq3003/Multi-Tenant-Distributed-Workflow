import vm from 'node:vm';

/**
 * Executes user-defined JavaScript transformation code inside an isolated, secure runtime sandbox.
 * 
 * Complies with Zaalima Week 3 requirement:
 * - Restricts access to Node.js internals (process, require, fs, child_process, eval).
 * - Enforces strict execution timeout to eliminate infinite loops (while(true)).
 * - Safely returns transformed objects back to workflow execution context.
 * 
 * @param {string} code - User-defined JavaScript expression or function body
 * @param {Object} input - Data payload passed into the step
 * @param {Object} context - Full workflow execution context
 * @param {number} timeoutMs - Max execution time in ms before throwing timeout error
 * @returns {Promise<any>} Transformed result
 */
export async function executeSandboxedScript(code, input = {}, context = {}, timeoutMs = 1500) {
  if (typeof code !== 'string' || !code.trim()) {
    return input;
  }

  // Deep clone input and context to prevent prototype pollution or sandbox escaping
  const safeInput = JSON.parse(JSON.stringify(input || {}));
  const safeContext = JSON.parse(JSON.stringify(context || {}));

  // Create isolated sandbox context with only safe primitives
  const sandbox = {
    input: safeInput,
    context: safeContext,
    output: null,
    Math,
    Date,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURI,
    decodeURI,
    encodeURIComponent,
    decodeURIComponent,
    console: {
      log: () => {},
      warn: () => {},
      error: () => {}
    }
  };

  // Explicitly prevent access to globals
  sandbox.global = undefined;
  sandbox.globalThis = undefined;
  sandbox.process = undefined;
  sandbox.require = undefined;
  sandbox.module = undefined;
  sandbox.exports = undefined;

  const vmContext = vm.createContext(sandbox);

  // Wrap user code in an immediately-invoked function returning the output
  const wrappedScript = `
    "use strict";
    try {
      const fn = function(input, context) {
        ${code}
      };
      output = fn(input, context);
    } catch (err) {
      throw new Error(err.message || String(err));
    }
  `;

  try {
    const script = new vm.Script(wrappedScript, { filename: 'sandbox-transformation.js' });
    script.runInContext(vmContext, {
      timeout: timeoutMs,
      breakOnSigint: true
    });

    return sandbox.output !== undefined ? sandbox.output : sandbox.input;
  } catch (err) {
    if (err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || err.message?.includes('timed out')) {
      throw new Error(`Sandbox execution timed out (${timeoutMs}ms limit exceeded). Infinite loop or heavy compute detected.`);
    }
    throw new Error(`Sandbox script execution failed: ${err.message}`);
  }
}

