adb root

adb wait-for-device

adb shell content insert \
  --uri content://com.google.settings/partner \
  --bind name:s:use_location_for_services \
  --bind value:i:1

adb shell settings put secure location_providers_allowed gps,network

adb shell content insert \
  --uri content://com.google.settings/partner \
  --bind name:s:network_location_opt_in \
  --bind value:i:1

adb shell cmd location set-location-enabled true
