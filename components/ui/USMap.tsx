'use client'

import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from 'react-simple-maps'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

type Hub = {
  name: string
  state: string
  coordinates: [number, number]
}

const HUBS: Hub[] = [
  { name: 'State College', state: 'PA', coordinates: [-77.86, 40.79] },
]

export function USMap() {
  return (
    <div className="w-full">
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1000 }}
        width={800}
        height={500}
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                style={{
                  default: {
                    fill: 'var(--color-surface-container-low)',
                    stroke: 'var(--color-on-surface-variant)',
                    strokeWidth: 0.5,
                    outline: 'none',
                  },
                  hover: {
                    fill: 'var(--color-surface-container-high)',
                    stroke: 'var(--color-on-surface-variant)',
                    strokeWidth: 0.5,
                    outline: 'none',
                  },
                  pressed: {
                    fill: 'var(--color-surface-container-high)',
                    stroke: 'var(--color-on-surface-variant)',
                    strokeWidth: 0.5,
                    outline: 'none',
                  },
                }}
              />
            ))
          }
        </Geographies>

        {HUBS.map((hub) => (
          <Marker key={hub.name} coordinates={hub.coordinates}>
            <circle
              r={5}
              fill="var(--color-primary)"
              stroke="var(--color-surface)"
              strokeWidth={1.5}
            />
            <circle
              r={10}
              fill="var(--color-primary)"
              opacity={0.15}
            />
            <text
              textAnchor="middle"
              y={-14}
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 8,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fill: 'var(--color-on-surface)',
              }}
            >
              {hub.name}
            </text>
          </Marker>
        ))}
      </ComposableMap>
    </div>
  )
}
