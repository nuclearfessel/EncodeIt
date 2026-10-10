/** In-app user guide shown from Help → Documentation. */

export type DocBlock =
  | { type: 'p'; text: string }
  | { type: 'note'; text: string }
  | { type: 'ol'; items: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'kbd'; rows: Array<{ keys: string; action: string }> }
  | { type: 'sub'; title: string; blocks: DocBlock[] }

export interface DocSection {
  id: string
  title: string
  blocks: DocBlock[]
}

export const USER_GUIDE_TITLE = 'Encode This documentation'

export const USER_GUIDE_SECTIONS: DocSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    blocks: [
      {
        type: 'p',
        text: 'Encode This is a batch media encoder with an Adobe Media Encoder / Shutter Encoder–style queue and preset browser.'
      },
      {
        type: 'p',
        text: 'Add media, choose a preset, start the queue, and FFmpeg encodes each job. Watch folders let After Effects, Premiere Pro, and DaVinci Resolve hand off renders without scripts.'
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
        text: 'Default output folder: Videos (Windows) or Movies (macOS) → Encode This → Output.'
      }
    ]
  },
  {
    id: 'presets',
    title: 'Presets & formats',
    blocks: [
      {
        type: 'p',
        text: 'The Preset Browser groups presets similarly to AME system presets — social, broadcast, mezzanine, and more.'
      },
      {
        type: 'p',
        text: 'Presets map to open FFmpeg recipes inspired by Adobe Media Encoder, Shutter Encoder, Apple Compressor, and TMPGEnc families.'
      },
      {
        type: 'note',
        text: 'Proprietary wrappers (full Dolby Vision packages, Wraptor DCP, certified AS-11, etc.) are not claimed. Broadcast options are best-effort FFmpeg mappings.'
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
          'Encoding panel — export video/audio, audio codec overrides, hardware acceleration for the selected job(s).',
          'Hardware — NVENC, QSV, AMF, or VideoToolbox when bundled FFmpeg and your GPU support them.',
          'Preferences → Hardware — see what was detected on this machine.',
          'Preferences → General — default output folder, concurrency, and overwrite behavior.'
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
          'Dock, split, and undock panels like a dense AME-style layout.',
          'Drag a panel header to tear it off or drop it on another edge.',
          'View → Dock All Panels / Show All Panels restores visibility.',
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
        type: 'p',
        text: 'Watch folders automatically queue new media that appears in a directory. This is the primary way After Effects, Premiere Pro, and DaVinci Resolve hand work to Encode This — no scripts required.'
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
              'Keep Encode This running while the host app finishes writing the file.',
              'When a new media file appears (and is done writing), it is added to the queue with that watch’s preset.'
            ]
          },
          {
            type: 'note',
            text: 'Files already in the folder when you add or enable a watch are ignored — only new arrivals are queued. You can add extra watches for any folder, not just the install layout.'
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
        text: 'Encode This integrates with After Effects, Premiere Pro, and DaVinci Resolve by watching shared folders. Point each host’s render/export destination at the matching folder; Encode This picks up finished files and encodes them with FFmpeg presets.'
      },
      {
        type: 'sub',
        title: 'Install modes',
        blocks: [
          {
            type: 'p',
            text: 'On install (or first launch), Encode This detects which host apps are installed on disk. They do not need to be running for detection.'
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
              ['Output', 'Default Encode This encode output']
            ]
          },
          {
            type: 'table',
            headers: ['Platform', 'Root path'],
            rows: [
              ['Windows', '%USERPROFILE%\\Videos\\Encode This\\'],
              ['macOS', '~/Movies/Encode This/']
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
              'Install Encode This (or complete first-launch integration setup) so the folders exist.',
              'Confirm paths under Edit → Preferences → Integrations.',
              'In the host app, set render/export output to the matching from-* folder.',
              'Leave Encode This running, then render/export as usual.',
              'New files appear in the Encode This queue; Start Queue if it is not already running.'
            ]
          },
          {
            type: 'note',
            text: 'Encode This does not replace AE/Premiere/Resolve codecs or Deliver UI. It encodes after the host writes a file. Optional scripts/CEP for one-off sends live in the GitHub integrations/ folder.'
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
        text: 'Recommended workflow: render compositions into the Encode This `from-ae` watch folder. No scripts or panels required.'
      },
      {
        type: 'sub',
        title: 'Watch-folder workflow',
        blocks: [
          {
            type: 'ol',
            items: [
              'Confirm `from-ae` exists (Preferences → Integrations). Typical path: Videos/Movies → Encode This → from-ae.',
              'In After Effects, open Composition → Add to Render Queue (or use the Render Queue panel).',
              'Set the Output Module’s output file into the `from-ae` folder.',
              'Use a high-quality intermediate in AE when you want Encode This to handle delivery codecs (ProRes, DNx, high-bitrate H.264, etc.).',
              'Keep Encode This running, then Render. When the file finishes writing, it is queued automatically.'
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
              'Finished encodes go to the watch’s output folder (default: Encode This → Output).',
              'If you already rendered elsewhere, copy/move the finished file into `from-ae` while Encode This is watching — or use Add Source….'
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
            text: 'GitHub `integrations/after-effects` includes `SendToEncodeThis.jsx` and a CEP panel that talk to the Host intake API for one-off sends without a watch folder. Enable AE Scripting network access if you use them.'
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
        text: 'Resolve does not allow replacing Deliver codecs with a third-party encoder. The supported path is Deliver into the Encode This `from-resolve` folder, then let Encode This re-encode for delivery.'
      },
      {
        type: 'sub',
        title: 'Deliver workflow',
        blocks: [
          {
            type: 'ol',
            items: [
              'Confirm `from-resolve` exists (Preferences → Integrations). Typical path: Videos/Movies → Encode This → from-resolve.',
              'In Resolve, open the Deliver page and set Filename / Location to that folder.',
              'Choose a high-quality master or intermediate in Deliver (e.g. ProRes, DNxHR, or a high-bitrate mezzanine) — Encode This will create the final delivery formats.',
              'Add to Render Queue and Start Render while Encode This is running.',
              'When Deliver finishes writing, Encode This queues the new file with the `from-resolve` watch preset.'
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
            text: 'GitHub `integrations/davinci-resolve` has Python helpers (`send_to_encode_this.py`, `resolve_deliver_handoff.py`) for intake API / Utility script workflows when you do not want a watch folder. Host intake must be enabled.'
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
        text: 'Recommended workflow: export sequences into the Encode This `from-premiere` watch folder. Encode This then applies FFmpeg presets for batch delivery.'
      },
      {
        type: 'sub',
        title: 'Export workflow',
        blocks: [
          {
            type: 'ol',
            items: [
              'Confirm `from-premiere` exists (Preferences → Integrations). Typical path: Videos/Movies → Encode This → from-premiere.',
              'In Premiere, use File → Export → Media (or the Export panel).',
              'Set the Output Name / location to the `from-premiere` folder.',
              'Export a master or mezzanine you are happy to re-encode from, or export the delivery format you want Encode This to process further.',
              'Keep Encode This running, then Export. When the file finishes, it appears in the Encode This queue.'
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
              'Adobe Media Encoder is not required for this path — export to disk into `from-premiere` instead.',
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
            text: 'GitHub `integrations/premiere` includes `SendToEncodeThis.jsx` for one-off handoff via the Host intake API / inbox. Enable Premiere scripting network access if you use it.'
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
            'Keep Encode This running; wait until AE/Resolve/Premiere finishes writing; only new files after the watch is enabled are queued.'
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
