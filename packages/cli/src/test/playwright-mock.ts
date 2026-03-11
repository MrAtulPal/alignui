type LaunchFn = (opts: { headless: boolean }) => Promise<any>;

let launchImpl: LaunchFn | null = null;

export function __setChromiumLaunch(fn: LaunchFn) {
  launchImpl = fn;
}

export const chromium = {
  launch: async (opts: { headless: boolean }) => {
    if (!launchImpl) throw new Error("playwright mock: chromium.launch not configured (call __setChromiumLaunch)");
    return launchImpl(opts);
  }
};

