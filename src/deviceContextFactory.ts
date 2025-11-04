import { devices, type BrowserContextOptions } from "playwright"
import { config } from "./config"

type PlaywrightDeviceDescriptor = (typeof devices)[keyof typeof devices]
type DeviceKind = "desktop" | "mobile" | "tablet"

type ContextOptions = BrowserContextOptions & {
  screen?: NonNullable<BrowserContextOptions["screen"]>
}

type DeviceProfileInit = {
  descriptorName: string | undefined
  type: DeviceKind
  fallback: ContextOptions
  overrides: ContextOptions
}

export class DeviceContextFactory {
  private desktopWarningEmitted = false
  private mobileWarningEmitted = false
  private tabletWarningEmitted = false

  buildDesktopContextOptions(): BrowserContextOptions {
    return this.buildDeviceProfile({
      type: "desktop",
      descriptorName: config.DESKTOP_DEVICE_DESCRIPTOR,
      fallback: DeviceContextFactory.withScreen(
        {
          viewport: config.DESKTOP_VIEWPORT,
          deviceScaleFactor: config.DESKTOP_DEVICE_SCALE_FACTOR,
          userAgent: config.DESKTOP_USER_AGENT,
          isMobile: false,
          hasTouch: false,
        },
        config.DESKTOP_SCREEN,
      ),
      overrides: {
        locale: config.DESKTOP_LOCALE,
        timezoneId: config.DESKTOP_TIMEZONE_ID,
        colorScheme: config.DESKTOP_COLOR_SCHEME,
      },
    })
  }

  buildMobileContextOptions(): BrowserContextOptions {
    return this.buildDeviceProfile({
      type: "mobile",
      descriptorName: config.MOBILE_DEVICE_DESCRIPTOR,
      fallback: DeviceContextFactory.withScreen(
        {
          viewport: config.MOBILE_VIEWPORT,
          isMobile: true,
          hasTouch: true,
          deviceScaleFactor: config.MOBILE_DEVICE_SCALE_FACTOR,
          userAgent: config.DEFAULT_MOBILE_USER_AGENT,
        },
        config.MOBILE_SCREEN,
      ),
      overrides: {
        locale: config.MOBILE_LOCALE,
        timezoneId: config.MOBILE_TIMEZONE_ID,
        colorScheme: config.MOBILE_COLOR_SCHEME,
      },
    })
  }

  buildTabletContextOptions(): BrowserContextOptions {
    return this.buildDeviceProfile({
      type: "tablet",
      descriptorName: config.TABLET_DEVICE_DESCRIPTOR,
      fallback: DeviceContextFactory.withScreen(
        {
          viewport: config.TABLET_VIEWPORT,
          isMobile: true,
          hasTouch: true,
          deviceScaleFactor: config.TABLET_DEVICE_SCALE_FACTOR,
          userAgent: config.DEFAULT_TABLET_USER_AGENT,
        },
        config.TABLET_SCREEN,
      ),
      overrides: {
        locale: config.TABLET_LOCALE,
        timezoneId: config.TABLET_TIMEZONE_ID,
        colorScheme: config.TABLET_COLOR_SCHEME,
      },
    })
  }

  private resolveDescriptor(
    descriptorName: string | undefined,
    type: DeviceKind,
  ): PlaywrightDeviceDescriptor | null {
    const trimmed = descriptorName?.trim()

    if (!trimmed) {
      return null
    }

    const descriptor = (devices as Record<string, PlaywrightDeviceDescriptor>)[trimmed]

    if (!descriptor) {
      this.emitWarning(type, trimmed)
      return null
    }

    return descriptor
  }

  private buildDeviceProfile({
    descriptorName,
    type,
    fallback,
    overrides,
  }: DeviceProfileInit): ContextOptions {
    const descriptor = this.resolveDescriptor(descriptorName, type)
    const baseOptions = descriptor ? this.normalizeDescriptor(descriptor, fallback) : fallback
    return DeviceContextFactory.mergeOptions(baseOptions, overrides)
  }

  private normalizeDescriptor(
    descriptor: PlaywrightDeviceDescriptor,
    fallback: ContextOptions,
  ): ContextOptions {
    const typedDescriptor = descriptor as PlaywrightDeviceDescriptor & ContextOptions
    const { defaultBrowserType: _defaultBrowserType, ...options } = typedDescriptor

    return {
      ...options,
      viewport: options.viewport ?? fallback.viewport,
      screen: options.screen ?? fallback.screen,
      deviceScaleFactor: options.deviceScaleFactor ?? fallback.deviceScaleFactor,
      isMobile: options.isMobile ?? fallback.isMobile,
      hasTouch: options.hasTouch ?? fallback.hasTouch,
      userAgent: options.userAgent ?? fallback.userAgent,
    }
  }

  private static mergeOptions(
    baseOptions: ContextOptions,
    overrides: ContextOptions,
  ): ContextOptions {
    return {
      ...baseOptions,
      ...overrides,
      viewport: overrides.viewport ?? baseOptions.viewport,
      screen: overrides.screen ?? baseOptions.screen,
    }
  }

  private emitWarning(type: DeviceKind, descriptorName: string) {
    if (type === "desktop") {
      if (!this.desktopWarningEmitted) {
        console.warn(
          `Desktop device descriptor "${descriptorName}" not found. Falling back to custom desktop emulation.`,
        )
        this.desktopWarningEmitted = true
      }

      return
    }

    if (type === "mobile") {
      if (!this.mobileWarningEmitted) {
        console.warn(
          `Mobile device descriptor "${descriptorName}" not found. Falling back to basic mobile emulation.`,
        )
        this.mobileWarningEmitted = true
      }

      return
    }

    if (!this.tabletWarningEmitted) {
      console.warn(
        `Tablet device descriptor "${descriptorName}" not found. Falling back to basic tablet emulation.`,
      )
      this.tabletWarningEmitted = true
    }
  }

  private static withScreen(
    options: BrowserContextOptions,
    screen?: ContextOptions["screen"],
  ): ContextOptions {
    if (!screen) {
      return options
    }

    return {
      ...options,
      screen,
    }
  }
}
