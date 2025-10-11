#import <Capacitor/Capacitor.h>

CAP_PLUGIN(AudioInputPlugin, "AudioInputPlugin",
    CAP_PLUGIN_METHOD(getAvailableInputs, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getCurrentInput, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setPreferredInput, CAPPluginReturnPromise);
)
