Pod::Spec.new do |s|
  s.name = 'AudioInputPlugin'
  s.version = '1.0.0'
  s.summary = 'Capacitor plugin for iOS audio input device management'
  s.license = 'MIT'
  s.homepage = 'https://github.com/lovable-dev/riff-layer-muse'
  s.author = 'Lovable'
  s.source = { :git => 'https://github.com/lovable-dev/riff-layer-muse', :tag => s.version.to_s }
  s.source_files = 'ios/Plugin/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target  = '13.0'
  s.swift_version = '5.1'
  s.dependency 'Capacitor'
  s.static_framework = true
end
