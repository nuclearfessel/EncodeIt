# Windows package icon paths

Apply these snippets to the existing package manifest. Retain all associated scale-qualified image files.

## Package Store-logo property

```xml
<Properties>
  <DisplayName>EncodeIt</DisplayName>
  <PublisherDisplayName>EncodeIt</PublisherDisplayName>
  <Logo>images\StoreLogo.png</Logo>
</Properties>
```

## Application logos

Keep the `uap` namespace already declared on the parent package manifest. Place `VisualElements` on the existing application element:

```xml
<uap:VisualElements DisplayName="EncodeIt" Description="EncodeIt" BackgroundColor="transparent" ForegroundText="light" Square44x44Logo="images\Square44x44Logo.png" Square150x150Logo="images\Square150x150Logo.png" Square71x71Logo="images\Square71x71Logo.png" Square310x310Logo="images\Square310x310Logo.png" Wide310x150Logo="images\Wide310x150Logo.png" />
```

The Store-logo and other image-scale filenames in `package/images/` follow the Windows resource qualifier convention. The transparent AppList target-size files support unplated light/dark Start and taskbar icons. Replace only this target's current app logo assets.
