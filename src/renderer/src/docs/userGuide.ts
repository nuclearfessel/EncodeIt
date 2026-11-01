/** In-app user guide shown from Help → Documentation. */

export type DocBlock =
  | { type: 'p'; text: string }
  | { type: 'note'; text: string }
  | { type: 'ol'; items: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'kbd'; rows: Array<{ keys: string; action: string }> }
  | { type: 'figure'; src: string; srcDark?: string; alt: string; caption?: string }
  | { type: 'sub'; title: string; blocks: DocBlock[] }

export interface DocSection {
  id: string
  title: string
  blocks: DocBlock[]
}

export const USER_GUIDE_TITLE = 'EncodeIt documentation'

export const USER_GUIDE_SECTIONS: DocSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    blocks: [
      {
        type: 'figure',
        src: new URL('../assets/readme-banner-light.svg', import.meta.url).href,
        srcDark: new URL('../assets/readme-banner-dark.svg', import.meta.url).href,
        alt: 'EncodeIt — Open-source batch media encoding. Powered by FFmpeg. Windows, macOS, and Linux.'
      },
      {
        type: 'p',
        text: 'EncodeIt is a batch media encoder with an queue and preset browser powered by FFmpeg.'
      },
      {
        type: 'p',
        text: 'Add media, choose a preset, start the queue, and FFmpeg encodes each job. Watch folders let After Effects, Premiere Pro, and DaVinci Resolve hand off renders without scripts.'
      },
      {
        type: 'figure',
        src: new URL('../assets/workflow-light.svg', import.meta.url).href,
        srcDark: new URL('../assets/workflow-dark.svg', import.meta.url).href,
        alt: 'EncodeIt workflow: add media, choose a preset, start the queue, then deliver encoded files to your chosen output path.',
        caption: 'SOURCE → PRESET → QUEUE → OUTPUT'
      }
    ]
  },
  {
    id: 'quick-start',
    title: 'Quick start',
    blocks: [
      {
        type: 'ol',
        items: [
          'Click Add Source… (File → Add Source… or Ctrl+O), or drag files onto the window.',
          'Select a preset in the Preset Browser (or keep the default).',
          'Confirm the output path in Encoding / Source · Output if needed.',
          'Click Start Queue (File → Start Queue or Ctrl+Enter).',
          'Watch progress in the queue. Use Stop (Ctrl+.) to cancel.'
        ]
      }
    ]
  },
  {
    id: 'queue',
    title: 'Queue',
    blocks: [
      {
        type: 'ul',
        items: [
          'Each row is one encode job: source, preset, status, and progress.',
          'Multi-select jobs to change preset, output path, or export tracks together.',
          'Clear Done removes finished jobs from the list.',
          'Output files go to each job’s output path.'
        ]
      },
      {
        type: 'note',
        text: 'Default output folder: Videos (Windows) or Movies (macOS) → EncodeIt → Output.'
      }
    ]
  },
  {
    id: 'presets',
    title: 'Presets & formats',
    blocks: [
      {
        type: 'p',
        text: 'The Preset Browser groups presets by delivery target — social, broadcast, mezzanine, and more.'
      },
      {
        type: 'p',
        text: 'Presets map to open FFmpeg recipes for common delivery targets.'
      },
      {
        type: 'note',
        text: 'Proprietary certified wrappers (full Dolby Vision packages, DCP packaging, certified AS-11, etc.) are not claimed. Broadcast options are best-effort FFmpeg mappings.'
      }
    ]
  },
  {
    id: 'encoding',
    title: 'Encoding options',
    blocks: [
      {
        type: 'ul',
        items: [
          'Encoding panel — quick edits: export tracks, resolution, frame rate, bitrate/CRF, audio codec, output path, hardware.',
          'Export Settings… — full dialog from the Encoding panel, queue Preset/Format cells, or Edit → Export Settings…',
          'Per-job overrides sit on top of the preset; a custom badge appears when they differ. Applying another preset clears overrides.',
          'Save as Custom Preset stores a User preset in the Preset Browser.',
          'Multi-select jobs before Export Settings to apply the same overrides together.',
          'Hardware — NVENC, QSV, AMF, or VideoToolbox when bundled FFmpeg and your GPU support them.',
          'Preferences → Hardware — see what was detected on this machine.',
          'Preferences → General — default output folder, max concurrent encodes (1–8), and overwrite behavior.',
          'If overwrite is off, jobs fail when the output file already exists.',
          'Hardware encodes that fail may automatically retry with software encoding.'
        ]
      }
    ]
  },
  {
    id: 'workspace',
    title: 'Workspace',
    blocks: [
      {
        type: 'ul',
        items: [
          'Dock, split, and undock panels in a flexible workspace layout.',
          'Drag a panel header to tear it off or drop it on another edge.',
          'Window → panel names toggles visibility; View → Dock All / Show All restores panels.',
          'Window → New Workspace… saves the current layout under a name (like Adobe Media Encoder).',
          'Switch named layouts from Window → workspace list or the toolbar Workspace menu.',
          'Save Changes to this Workspace updates the active named layout after you rearrange panels.',
          'Reset to Saved Layout restores the last saved version; Reset to Default Layout clears custom arrangement.',
          'Media Browser browses folders and can add media to the queue.'
        ]
      }
    ]
  },
  {
    id: 'watch-folders',
    title: 'Watch folders',
    blocks: [
      {
        type: 'figure',
        src: new URL('../assets/integrations-light.svg', import.meta.url).href,
        srcDark: new URL('../assets/integrations-dark.svg', import.meta.url).href,
        alt: 'After Effects, Premiere Pro, and DaVinci Resolve export to watch folders. After files settle, the EncodeIt queue uses FFmpeg to encode them to Output.',
        caption: 'File handoff — not a native host codec replacement.'
      },
      {
        type: 'p',
        text: 'Watch folders automatically queue new media that appears in a directory. This is the primary way After Effects, Premiere Pro, and DaVinci Resolve hand work to EncodeIt — no scripts required.'
      },
      {
        type: 'sub',
        title: 'How to set one up',
        blocks: [
          {
            type: 'ol',
            items: [
              'Open Edit → Preferences → Integrations to see install paths and active watches.',
              'Each watch has a folder path, a preset used for new files, and an encode output folder.',
              'Keep EncodeIt running while the host app finishes writing the file.',
              'When a new media file appears and its size stays stable across polls, it is added to the queue with that watch’s preset.',
              'Per watch: enable/disable, auto-start queue, and optional subfolder watching.'
            ]
          },
          {
            type: 'note',
            text: 'Files already in the folder when you add or enable a watch are ignored — only new arrivals are queued. Incomplete writes are held until size settles. Help → Open Log File shows the app log.'
          }
        ]
      }
    ]
  },
  {
    id: 'host-integrations',
    title: 'Host integrations overview',
    blocks: [
      {
        type: 'p',
        text: 'EncodeIt integrates with After Effects, Premiere Pro, and DaVinci Resolve by watching shared folders. Point each host’s render/export destination at the matching folder; EncodeIt picks up finished files and encodes them with FFmpeg presets.'
      },
      {
        type: 'sub',
        title: 'Install modes',
        blocks: [
          {
            type: 'p',
            text: 'On install (or first launch), EncodeIt detects which host apps are installed on disk. They do not need to be running for detection.'
          },
          {
            type: 'ul',
            items: [
              '**Standard** — creates folders and watches only for detected apps.',
              '**Custom** — choose After Effects, DaVinci Resolve, and/or Premiere Pro yourself (even if not installed yet).'
            ]
          }
        ]
      },
      {
        type: 'sub',
        title: 'Folder layout',
        blocks: [
          {
            type: 'table',
            headers: ['Folder', 'Host destination'],
            rows: [
              ['from-ae', 'After Effects Output Module / render output'],
              ['from-resolve', 'DaVinci Resolve Deliver destination'],
              ['from-premiere', 'Premiere Pro export / Media Export location'],
              ['Output', 'Default EncodeIt encode output']
            ]
          },
          {
            type: 'table',
            headers: ['Platform', 'Root path'],
            rows: [
              ['Windows', '%USERPROFILE%\\Videos\\EncodeIt\\'],
              ['macOS', '~/Movies/EncodeIt/']
            ]
          }
        ]
      },
      {
        type: 'sub',
        title: 'Shared setup steps',
        blocks: [
          {
            type: 'ol',
            items: [
              'Install EncodeIt (or complete first-launch integration setup) so the folders exist.',
              'Confirm paths under Edit → Preferences → Integrations.',
              'In the host app, set render/export output to the matching from-* folder.',
              'Leave EncodeIt running, then render/export as usual.',
              'New files appear in the EncodeIt queue; Start Queue if it is not already running.'
            ]
          },
          {
            type: 'note',
            text: 'EncodeIt does not replace AE/Premiere/Resolve codecs or Deliver UI. It encodes after the host writes a file. Optional scripts/CEP for one-off sends live in the GitHub integrations/ folder.'
          }
        ]
      }
    ]
  },
  {
    id: 'after-effects',
    title: 'After Effects',
    blocks: [
      {
        type: 'p',
        text: 'Recommended workflow: render compositions into the EncodeIt `from-ae` watch folder. No scripts or panels required.'
      },
      {
        type: 'sub',
        title: 'Watch-folder workflow',
        blocks: [
          {
            type: 'ol',
            items: [
              'Confirm `from-ae` exists (Preferences → Integrations). Typical path: Videos/Movies → EncodeIt → from-ae.',
              'In After Effects, open Composition → Add to Render Queue (or use the Render Queue panel).',
              'Set the Output Module’s output file into the `from-ae` folder.',
              'Use a high-quality intermediate in AE when you want EncodeIt to handle delivery codecs (ProRes, DNx, high-bitrate H.264, etc.).',
              'Keep EncodeIt running, then Render. When the file finishes writing, it is queued automatically.'
            ]
          }
        ]
      },
      {
        type: 'sub',
        title: 'Tips',
        blocks: [
          {
            type: 'ul',
            items: [
              'Change the preset for AE handoffs under Preferences → Integrations on the `from-ae` watch.',
              'Finished encodes go to the watch’s output folder (default: EncodeIt → Output).',
              'If you already rendered elsewhere, copy/move the finished file into `from-ae` while EncodeIt is watching — or use Add Source….'
            ]
          }
        ]
      },
      {
        type: 'sub',
        title: 'Optional scripts & CEP',
        blocks: [
          {
            type: 'note',
            text: 'GitHub `integrations/after-effects` includes `SendToEncodeIt.jsx` and a CEP panel that talk to the Host intake API for one-off sends without a watch folder. Enable AE Scripting network access if you use them.'
          }
        ]
      }
    ]
  },
  {
    id: 'resolve',
    title: 'DaVinci Resolve',
    blocks: [
      {
        type: 'p',
        text: 'Resolve does not allow replacing Deliver codecs with a third-party encoder. The supported path is Deliver into the EncodeIt `from-resolve` folder, then let EncodeIt re-encode for delivery.'
      },
      {
        type: 'sub',
        title: 'Deliver workflow',
        blocks: [
          {
            type: 'ol',
            items: [
              'Confirm `from-resolve` exists (Preferences → Integrations). Typical path: Videos/Movies → EncodeIt → from-resolve.',
              'In Resolve, open the Deliver page and set Filename / Location to that folder.',
              'Choose a high-quality master or intermediate in Deliver (e.g. ProRes, DNxHR, or a high-bitrate mezzanine) — EncodeIt will create the final delivery formats.',
              'Add to Render Queue and Start Render while EncodeIt is running.',
              'When Deliver finishes writing, EncodeIt queues the new file with the `from-resolve` watch preset.'
            ]
          }
        ]
      },
      {
        type: 'sub',
        title: 'Tips',
        blocks: [
          {
            type: 'ul',
            items: [
              'Adjust the Resolve watch preset and encode output under Preferences → Integrations.',
              'You can Deliver multiple timelines into `from-resolve`; each new file becomes its own queue job.',
              'Wait for Deliver to complete before expecting a queue entry.'
            ]
          }
        ]
      },
      {
        type: 'sub',
        title: 'Optional Python helpers',
        blocks: [
          {
            type: 'note',
            text: 'GitHub `integrations/davinci-resolve` has Python helpers (`send_to_encodeit.py`, `resolve_deliver_handoff.py`) for intake API / Utility script workflows when you do not want a watch folder. Host intake must be enabled.'
          }
        ]
      }
    ]
  },
  {
    id: 'premiere',
    title: 'Premiere Pro',
    blocks: [
      {
        type: 'p',
        text: 'Recommended workflow: export sequences into the EncodeIt `from-premiere` watch folder. EncodeIt then applies FFmpeg presets for batch delivery.'
      },
      {
        type: 'sub',
        title: 'Export workflow',
        blocks: [
          {
            type: 'ol',
            items: [
              'Confirm `from-premiere` exists (Preferences → Integrations). Typical path: Videos/Movies → EncodeIt → from-premiere.',
              'In Premiere, use File → Export → Media (or the Export panel).',
              'Set the Output Name / location to the `from-premiere` folder.',
              'Export a master or mezzanine you are happy to re-encode from, or export the delivery format you want EncodeIt to process further.',
              'Keep EncodeIt running, then Export. When the file finishes, it appears in the EncodeIt queue.'
            ]
          }
        ]
      },
      {
        type: 'sub',
        title: 'Tips',
        blocks: [
          {
            type: 'ul',
            items: [
              'Export to disk into `from-premiere` — no third-party encoder panel required.',
              'Change the Premiere watch preset under Preferences → Integrations.',
              'Batch: export several sequences into `from-premiere`; each completed file is queued separately.'
            ]
          }
        ]
      },
      {
        type: 'sub',
        title: 'Optional ExtendScript',
        blocks: [
          {
            type: 'note',
            text: 'GitHub `integrations/premiere` includes `SendToEncodeIt.jsx` for one-off handoff via the Host intake API / inbox. Enable Premiere scripting network access if you use it.'
          }
        ]
      }
    ]
  },
  {
    id: 'intake',
    title: 'Host intake API',
    blocks: [
      {
        type: 'p',
        text: 'Optional localhost API for scripts and tools (Preferences → Integrations). Default base URL: `http://127.0.0.1:47821`'
      },
      {
        type: 'sub',
        title: 'Endpoints',
        blocks: [
          {
            type: 'table',
            headers: ['Endpoint', 'Purpose'],
            rows: [
              ['GET /health', 'Check that intake is running'],
              ['GET /presets', 'List preset ids and names'],
              ['POST /queue/add', 'Queue paths; optional presetId and start']
            ]
          }
        ]
      },
      {
        type: 'sub',
        title: 'Example & inbox',
        blocks: [
          {
            type: 'note',
            text: 'Example body: `{ "paths": ["D:/renders/clip.mov"], "presetId": "h264-match-source-high-bitrate", "start": true }`. A JSON inbox folder (shown in Preferences) is also polled.'
          }
        ]
      }
    ]
  },
  {
    id: 'updates-uninstall',
    title: 'Updates & uninstall',
    blocks: [
      {
        type: 'sub',
        title: 'Checking for updates',
        blocks: [
          {
            type: 'ul',
            items: [
              'Preferences → Updates → **Check for updates** enables automatic checks on launch and about once a day (on by default).',
              'The bottom status bar is always visible; it shows the app version, and update actions when a newer release exists.',
              '**Download…** opens the release in your browser — nothing is downloaded automatically.',
              '**Not now** clears the update notice for that version until a newer one ships.',
              '**Help → Check for Updates…** or Preferences → Updates → **Check now** runs a check immediately.'
            ]
          }
        ]
      },
      {
        type: 'sub',
        title: 'Installing a newer version',
        blocks: [
          {
            type: 'ul',
            items: [
              'Windows Setup detects an existing install, replaces the app, and keeps settings / queue / media by default. Check **Clean install** on the host-integrations page to wipe previous settings and plugins (you will be asked about media).',
              'macOS PKG upgrades in place; if prior data exists it offers **Keep Settings** or **Clean Install**.',
              'Linux .deb upgrades in place and keeps data by default; GUI installs can offer Clean Install (or set ENCODEIT_CLEAN_INSTALL=1).',
              'DMG / portable / AppImage: replace the app file; settings stay on disk. Use Help → Uninstall first if you want a wipe.'
            ]
          }
        ]
      },
      {
        type: 'sub',
        title: 'Uninstalling completely',
        blocks: [
          {
            type: 'ul',
            items: [
              '**Help → Uninstall EncodeIt…** removes settings, logs, custom presets, workspaces, CEP panels, and known AE / Premiere / Resolve scripts.',
              'By default it also deletes Videos/Movies → EncodeIt media folders (from-ae, Output, …). Check **Keep media folders** to spare those.',
              'Windows Setup uninstall asks the same Yes (wipe media) / No (keep media) question, then removes the installed app. That wipe is skipped when Setup is only upgrading (use **Clean install** on Setup to wipe during an upgrade).',
              'macOS PKG uninstall prompts similarly. DMG installs: use Help → Uninstall, then remove EncodeIt from Applications.',
              'Linux: deb remove runs cleanup; AppImage users can run `scripts/encodeit-uninstall.sh` or Help → Uninstall.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    blocks: [
      {
        type: 'kbd',
        rows: [
          { keys: 'Ctrl+O', action: 'Add Source…' },
          { keys: 'Ctrl+Enter', action: 'Start Queue' },
          { keys: 'Ctrl+.', action: 'Stop Queue' },
          { keys: 'Ctrl+,', action: 'Preferences' },
          { keys: 'F1', action: 'Documentation' },
          { keys: 'Alt+F4', action: 'Quit' }
        ]
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    blocks: [
      {
        type: 'table',
        headers: ['Problem', 'What to try'],
        rows: [
          [
            'Queue does nothing',
            'Confirm jobs are Waiting, a preset is selected, and Start Queue is enabled.'
          ],
          [
            'Hardware encode fails',
            'Set acceleration to None or Auto, or refresh detection under Preferences → Hardware.'
          ],
          [
            'Watch folder misses files',
            'Keep EncodeIt running; wait until AE/Resolve/Premiere finishes writing; only new files after the watch is enabled are queued.'
          ],
          [
            'Host app not detected',
            'Detection looks under Program Files (Windows) or Applications (macOS). Use Custom install, or add a watch manually in Preferences → Integrations.'
          ],
          [
            'AE/Resolve/Premiere file never queues',
            'Confirm the host is writing into the matching from-ae / from-resolve / from-premiere path shown in Preferences, and that the watch is enabled.'
          ],
          [
            'Wrong preset on host handoffs',
            'Edit the watch’s preset under Preferences → Integrations (each host folder has its own preset and output folder).'
          ]
        ]
      }
    ]
  }
]
