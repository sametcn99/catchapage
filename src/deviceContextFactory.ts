import { devices, type BrowserContextOptions } from "playwright"
import {
  DESKTOP_COLOR_SCHEME,
  DESKTOP_DEVICE_DESCRIPTOR,
  DESKTOP_DEVICE_SCALE_FACTOR,
  DESKTOP_LOCALE,
  DESKTOP_SCREEN,
  DESKTOP_TIMEZONE_ID,
  DESKTOP_USER_AGENT,
  DESKTOP_VIEWPORT,
  DEFAULT_MOBILE_USER_AGENT,
  DEFAULT_TABLET_USER_AGENT,
  MOBILE_COLOR_SCHEME,
  MOBILE_DEVICE_DESCRIPTOR,
  MOBILE_DEVICE_SCALE_FACTOR,
  MOBILE_LOCALE,
  MOBILE_SCREEN,
  MOBILE_TIMEZONE_ID,
  MOBILE_VIEWPORT,
  TABLET_COLOR_SCHEME,
  TABLET_DEVICE_DESCRIPTOR,
  TABLET_DEVICE_SCALE_FACTOR,
  TABLET_LOCALE,
  TABLET_SCREEN,
  TABLET_TIMEZONE_ID,
  TABLET_VIEWPORT,
} from "./config"

type PlaywrightDeviceDescriptor = (typeof devices)[keyof typeof devices]
type DeviceKind = "desktop" | "mobile" | "tablet"

type DeviceProfileInit = {
  descriptorName: string | undefined
  type: DeviceKind
  fallback: BrowserContextOptions
  overrides: BrowserContextOptions
}

export class DeviceContextFactory {
  private desktopWarningEmitted = false
  private mobileWarningEmitted = false
  private tabletWarningEmitted = false

  buildDesktopContextOptions(): BrowserContextOptions {
    return this.buildDeviceProfile({
      type: "desktop",
      descriptorName: DESKTOP_DEVICE_DESCRIPTOR,
      fallback: {
        viewport: DESKTOP_VIEWPORT,
        screen: DESKTOP_SCREEN,
        deviceScaleFactor: DESKTOP_DEVICE_SCALE_FACTOR,
        userAgent: DESKTOP_USER_AGENT,
        isMobile: false,
        hasTouch: false,
      },
      overrides: {
        locale: DESKTOP_LOCALE,
        timezoneId: DESKTOP_TIMEZONE_ID,
        colorScheme: DESKTOP_COLOR_SCHEME,
      },
    })
  }

  buildMobileContextOptions(): BrowserContextOptions {
    return this.buildDeviceProfile({
      type: "mobile",
      descriptorName: MOBILE_DEVICE_DESCRIPTOR,
      fallback: {
        viewport: MOBILE_VIEWPORT,
        screen: MOBILE_SCREEN,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: MOBILE_DEVICE_SCALE_FACTOR,
        userAgent: DEFAULT_MOBILE_USER_AGENT,
      },
      overrides: {
        locale: MOBILE_LOCALE,
        timezoneId: MOBILE_TIMEZONE_ID,
        colorScheme: MOBILE_COLOR_SCHEME,
      },
    })
  }

  buildTabletContextOptions(): BrowserContextOptions {
    return this.buildDeviceProfile({
      type: "tablet",
      descriptorName: TABLET_DEVICE_DESCRIPTOR,
      fallback: {
        viewport: TABLET_VIEWPORT,
        screen: TABLET_SCREEN,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: TABLET_DEVICE_SCALE_FACTOR,
        userAgent: DEFAULT_TABLET_USER_AGENT,
      },
      overrides: {
        locale: TABLET_LOCALE,
        timezoneId: TABLET_TIMEZONE_ID,
        colorScheme: TABLET_COLOR_SCHEME,
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
  }: DeviceProfileInit): BrowserContextOptions {
    const descriptor = this.resolveDescriptor(descriptorName, type)
    const baseOptions = descriptor ? this.normalizeDescriptor(descriptor, fallback) : fallback
    return DeviceContextFactory.mergeOptions(baseOptions, overrides)
  }

  private normalizeDescriptor(
    descriptor: PlaywrightDeviceDescriptor,
    fallback: BrowserContextOptions,
  ): BrowserContextOptions {
    const { defaultBrowserType: _defaultBrowserType, ...options } = descriptor

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
    baseOptions: BrowserContextOptions,
    overrides: BrowserContextOptions,
  ): BrowserContextOptions {
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
}
