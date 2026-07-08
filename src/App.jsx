import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'

import './style.css'
import {
  calculateOpeningArea,
  calculateRoomMetrics,
  calculateSetupMetrics,
  defaultSettings,
} from './heat.js'
import { loadDraft, loadSavedSetups, saveDraft, saveSavedSetups } from './storage.js'

const cloneData = (value) => JSON.parse(JSON.stringify(value))

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const createRoom = (overrides = {}) => ({
  id: createId(),
  name: 'New room',
  length: 4,
  width: 4,
  height: 2.4,
  floorHeatingCoverage: 0,
  centralHeatingUnits: 0,
  openings: [],
  ...overrides,
})

const createSetup = (overrides = {}) => ({
  id: createId(),
  name: 'My home setup',
  rooms: [],
  ...overrides,
})

const normalizeRoom = (room = {}) => ({
  ...createRoom(),
  ...room,
  openings: Array.isArray(room.openings) ? room.openings : [],
})

const normalizeSetup = (setup = {}) => ({
  ...createSetup(),
  ...setup,
  rooms: Array.isArray(setup.rooms) ? setup.rooms.map(normalizeRoom) : [],
})

const hydrateState = () => {
  const savedSetups = loadSavedSetups()
  const draft = loadDraft()

  return {
    activeScreen: draft?.activeScreen === 'settings' ? 'settings' : 'planner',
    settings: {
      ...defaultSettings,
      ...draft?.settings,
    },
    currentSetup: draft?.currentSetup ? normalizeSetup(draft.currentSetup) : createSetup(),
    savedSetups: Array.isArray(savedSetups) ? savedSetups.map(normalizeSetup) : [],
    statusMessage: draft?.statusMessage ?? 'Your data stays in this browser via localStorage.',
  }
}

const formatWatts = (value) => `${Math.round(value).toLocaleString()} W`
const formatSquareMeters = (value) => `${value.toFixed(1)} m²`
const formatCubicMeters = (value) => `${value.toFixed(1)} m³`

const getBalanceLabel = (balance) =>
  balance >= 0 ? 'covers the required heat output' : 'needs additional heating capacity'

const SavedSetupsList = ({ savedSetups, onDelete, onLoad }) => (
  <article className="card">
    <div className="card-header">
      <div>
        <h2>Saved setups</h2>
        <p>Load or remove previously saved home definitions.</p>
      </div>
    </div>
    <ul className="saved-list">
      {savedSetups.length ? (
        savedSetups.map((setup) => (
          <li key={setup.id}>
            <div>
              <strong>{setup.name}</strong>
              <span>{setup.rooms.length} room(s)</span>
            </div>
            <div className="button-row">
              <button className="button ghost" type="button" onClick={() => onLoad(setup.id)}>
                Load
              </button>
              <button className="button ghost" type="button" onClick={() => onDelete(setup.id)}>
                Delete
              </button>
            </div>
          </li>
        ))
      ) : (
        <li className="empty-state">No saved home setups yet.</li>
      )}
    </ul>
  </article>
)

const RoomCard = ({ onRemove, onRemoveOpening, onUpdateField, onAddOpening, room, settings }) => {
  const metrics = calculateRoomMetrics(room, settings)
  const balanceClass = metrics.heatBalance >= 0 ? 'positive' : 'negative'
  const openings = Array.isArray(room.openings) ? room.openings : []

  return (
    <article className="card room-card">
      <div className="card-header">
        <div>
          <h3>{room.name || 'Unnamed room'}</h3>
          <p>
            {formatWatts(metrics.requiredHeat)} required · {formatWatts(metrics.totalHeatProduction)} simulated
          </p>
        </div>
        <button className="button secondary" type="button" onClick={() => onRemove(room.id)}>
          Delete room
        </button>
      </div>

      <div className="room-grid">
        <label>
          Room name
          <input value={room.name} onChange={(event) => onUpdateField(room.id, 'name', event.target.value)} />
        </label>
        <label>
          Length (m)
          <input
            type="number"
            min="0"
            step="0.1"
            value={room.length}
            onChange={(event) => onUpdateField(room.id, 'length', Number(event.target.value))}
          />
        </label>
        <label>
          Width (m)
          <input
            type="number"
            min="0"
            step="0.1"
            value={room.width}
            onChange={(event) => onUpdateField(room.id, 'width', Number(event.target.value))}
          />
        </label>
        <label>
          Height (m)
          <input
            type="number"
            min="0"
            step="0.1"
            value={room.height}
            onChange={(event) => onUpdateField(room.id, 'height', Number(event.target.value))}
          />
        </label>
      </div>

      <div className="stats-grid">
        <div>
          <span>Volume</span>
          <strong>{formatCubicMeters(metrics.volume)}</strong>
        </div>
        <div>
          <span>Floor area</span>
          <strong>{formatSquareMeters(metrics.floorArea)}</strong>
        </div>
        <div>
          <span>Openings</span>
          <strong>{formatSquareMeters(metrics.windowArea + metrics.doorArea)}</strong>
        </div>
        <div className={balanceClass}>
          <span>Balance</span>
          <strong>{formatWatts(metrics.heatBalance)}</strong>
          <small>{getBalanceLabel(metrics.heatBalance)}</small>
        </div>
      </div>

      <section className="subsection">
        <div className="section-header">
          <div>
            <h4>Heating simulation</h4>
            <p>Compare floor heating and central heating output to the required room heat.</p>
          </div>
        </div>
        <div className="room-grid">
          <label>
            Floor heating coverage (%)
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={room.floorHeatingCoverage}
              onChange={(event) =>
                onUpdateField(room.id, 'floorHeatingCoverage', Number(event.target.value))
              }
            />
          </label>
          <label>
            Central heating units
            <input
              type="number"
              min="0"
              step="1"
              value={room.centralHeatingUnits}
              onChange={(event) => onUpdateField(room.id, 'centralHeatingUnits', Number(event.target.value))}
            />
          </label>
        </div>
        <div className="stats-grid compact">
          <div>
            <span>Floor heating output</span>
            <strong>{formatWatts(metrics.floorHeatingOutput)}</strong>
          </div>
          <div>
            <span>Central heating output</span>
            <strong>{formatWatts(metrics.centralHeatingOutput)}</strong>
          </div>
        </div>
      </section>

      <section className="subsection">
        <div className="section-header">
          <div>
            <h4>Doors and windows</h4>
            <p>Add each opening to factor extra heat loss into the room requirement.</p>
          </div>
        </div>
        <ul className="opening-list">
          {openings.length ? (
            openings.map((opening) => (
              <li key={opening.id}>
                <div>
                  <strong>{opening.name || 'Opening'}</strong>
                  <span>
                    {opening.type} · {opening.count} × {opening.width} m × {opening.height} m
                  </span>
                </div>
                <div className="opening-actions">
                  <span>{formatSquareMeters(calculateOpeningArea(opening))}</span>
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => onRemoveOpening(room.id, opening.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="empty-state">No doors or windows added yet.</li>
          )}
        </ul>
        <form className="inline-form" onSubmit={(event) => onAddOpening(event, room.id)}>
          <label>
            Type
            <select name="type" defaultValue="window">
              <option value="window">Window</option>
              <option value="door">Door</option>
            </select>
          </label>
          <label>
            Name
            <input name="name" placeholder="Front window" />
          </label>
          <label>
            Width (m)
            <input type="number" min="0" step="0.1" name="width" defaultValue="1" required />
          </label>
          <label>
            Height (m)
            <input type="number" min="0" step="0.1" name="height" defaultValue="1" required />
          </label>
          <label>
            Count
            <input type="number" min="1" step="1" name="count" defaultValue="1" required />
          </label>
          <button className="button" type="submit">
            Add opening
          </button>
        </form>
      </section>
    </article>
  )
}

const PlannerScreen = ({
  currentSetup,
  onAddOpening,
  onAddRoom,
  onDeleteSetup,
  onLoadSetup,
  onNewSetup,
  onRemoveOpening,
  onRemoveRoom,
  onSaveSetup,
  onUpdateRoomField,
  onUpdateSetupName,
  savedSetups,
  settings,
  setupMetrics,
}) => {
  const totalBalance = setupMetrics.totalHeatProduction - setupMetrics.totalRequiredHeat
  const totalBalanceClass = totalBalance >= 0 ? 'positive' : 'negative'

  return (
    <>
      <section className="grid">
        <article className="card">
          <div className="card-header">
            <div>
              <h2>Current home setup</h2>
              <p>Everything persists to localStorage on this browser only.</p>
            </div>
            <div className="button-row">
              <button className="button secondary" type="button" onClick={onNewSetup}>
                New setup
              </button>
              <button className="button" type="button" onClick={onSaveSetup}>
                Save setup
              </button>
            </div>
          </div>

          <label>
            Home setup name
            <input value={currentSetup.name} onChange={(event) => onUpdateSetupName(event.target.value)} />
          </label>

          <div className="stats-grid">
            <div>
              <span>Rooms</span>
              <strong>{currentSetup.rooms.length}</strong>
            </div>
            <div>
              <span>Total volume</span>
              <strong>{formatCubicMeters(setupMetrics.totalVolume)}</strong>
            </div>
            <div>
              <span>Total required heat</span>
              <strong>{formatWatts(setupMetrics.totalRequiredHeat)}</strong>
            </div>
            <div className={totalBalanceClass}>
              <span>Simulated balance</span>
              <strong>{formatWatts(totalBalance)}</strong>
              <small>{getBalanceLabel(totalBalance)}</small>
            </div>
          </div>
        </article>

        <SavedSetupsList savedSetups={savedSetups} onDelete={onDeleteSetup} onLoad={onLoadSetup} />
      </section>

      <section className="card add-room-card">
        <div className="card-header">
          <div>
            <h2>Rooms</h2>
            <p>Create rooms with dimensions, then add openings and heating elements.</p>
          </div>
        </div>
        <form className="inline-form" onSubmit={onAddRoom}>
          <label>
            Name
            <input name="name" placeholder="Living room" required />
          </label>
          <label>
            Length (m)
            <input type="number" min="0" step="0.1" name="length" defaultValue="5" required />
          </label>
          <label>
            Width (m)
            <input type="number" min="0" step="0.1" name="width" defaultValue="4" required />
          </label>
          <label>
            Height (m)
            <input type="number" min="0" step="0.1" name="height" defaultValue="2.4" required />
          </label>
          <button className="button" type="submit">
            Add room
          </button>
        </form>
      </section>

      <section className="room-list">
        {currentSetup.rooms.length ? (
          currentSetup.rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              settings={settings}
              onAddOpening={onAddOpening}
              onRemove={onRemoveRoom}
              onRemoveOpening={onRemoveOpening}
              onUpdateField={onUpdateRoomField}
            />
          ))
        ) : (
          <article className="card empty-state large">
            Add your first room to start calculating heat requirements.
          </article>
        )}
      </section>
    </>
  )
}

const SettingsScreen = ({ onUpdateSetting, settings }) => (
  <section className="card settings-card">
    <div className="card-header">
      <div>
        <h2>Heat formula settings</h2>
        <p>Adjust these defaults to match the heat formula you want to use for all rooms.</p>
      </div>
    </div>
    <div className="room-grid">
      <label>
        Base watts per cubic meter
        <input
          type="number"
          min="0"
          step="1"
          value={settings.wattsPerCubicMeter}
          onChange={(event) => onUpdateSetting('wattsPerCubicMeter', Number(event.target.value))}
        />
      </label>
      <label>
        Window heat loss per square meter
        <input
          type="number"
          min="0"
          step="1"
          value={settings.windowLossPerSquareMeter}
          onChange={(event) => onUpdateSetting('windowLossPerSquareMeter', Number(event.target.value))}
        />
      </label>
      <label>
        Door heat loss per square meter
        <input
          type="number"
          min="0"
          step="1"
          value={settings.doorLossPerSquareMeter}
          onChange={(event) => onUpdateSetting('doorLossPerSquareMeter', Number(event.target.value))}
        />
      </label>
      <label>
        Floor heating watts per square meter
        <input
          type="number"
          min="0"
          step="1"
          value={settings.floorHeatingWattsPerSquareMeter}
          onChange={(event) =>
            onUpdateSetting('floorHeatingWattsPerSquareMeter', Number(event.target.value))
          }
        />
      </label>
      <label>
        Central heating watts per unit
        <input
          type="number"
          min="0"
          step="1"
          value={settings.centralHeatingWattsPerUnit}
          onChange={(event) => onUpdateSetting('centralHeatingWattsPerUnit', Number(event.target.value))}
        />
      </label>
    </div>
    <article className="callout">
      <h3>Default formula</h3>
      <p>
        Required heat = room volume × base watts/m³ + window area × window loss + door area ×
        door loss.
      </p>
      <p>
        Simulated heat production = heated floor area × floor heating watts/m² + central heating
        units × watts per unit.
      </p>
    </article>
  </section>
)

const App = () => {
  const [state, setState] = useState(hydrateState)

  useEffect(() => {
    saveSavedSetups(state.savedSetups)
    saveDraft({
      activeScreen: state.activeScreen,
      currentSetup: state.currentSetup,
      settings: state.settings,
      statusMessage: state.statusMessage,
    })
  }, [state])

  const setupMetrics = useMemo(
    () => calculateSetupMetrics(state.currentSetup, state.settings),
    [state.currentSetup, state.settings],
  )

  const updateRoom = (roomId, updater) => {
    setState((currentState) => ({
      ...currentState,
      currentSetup: {
        ...currentState.currentSetup,
        rooms: currentState.currentSetup.rooms.map((room) =>
          room.id === roomId ? updater(room) : room,
        ),
      },
    }))
  }

  const updateRoomField = (roomId, field, value) => {
    updateRoom(roomId, (room) => ({
      ...room,
      [field]: value,
    }))
  }

  const addRoom = (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const room = createRoom({
      name: formData.get('name')?.toString() || 'New room',
      length: Number(formData.get('length')),
      width: Number(formData.get('width')),
      height: Number(formData.get('height')),
    })

    setState((currentState) => ({
      ...currentState,
      currentSetup: {
        ...currentState.currentSetup,
        rooms: [...currentState.currentSetup.rooms, room],
      },
      statusMessage: `Added room "${room.name}".`,
    }))

    form.reset()
  }

  const addOpening = (event, roomId) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const opening = {
      id: createId(),
      type: formData.get('type')?.toString() || 'window',
      name: formData.get('name')?.toString() || '',
      width: Number(formData.get('width')),
      height: Number(formData.get('height')),
      count: Number(formData.get('count')),
    }

    updateRoom(roomId, (room) => ({
      ...room,
      openings: [...room.openings, opening],
    }))

    form.reset()
  }

  const saveSetup = () => {
    setState((currentState) => {
      const currentSetup = {
        ...cloneData(currentState.currentSetup),
        id: currentState.currentSetup.id || createId(),
      }
      const existingIndex = currentState.savedSetups.findIndex((setup) => setup.id === currentSetup.id)
      const savedSetups = existingIndex >= 0 ? [...currentState.savedSetups] : [...currentState.savedSetups, currentSetup]

      if (existingIndex >= 0) {
        savedSetups[existingIndex] = currentSetup
      }

      return {
        ...currentState,
        currentSetup,
        savedSetups,
        statusMessage: `Saved "${currentSetup.name}" in this browser.`,
      }
    })
  }

  const loadSetup = (setupId) => {
    const setup = state.savedSetups.find((entry) => entry.id === setupId)

    if (!setup) {
      return
    }

    setState((currentState) => ({
      ...currentState,
      currentSetup: normalizeSetup(cloneData(setup)),
      statusMessage: `Loaded "${setup.name}" from this browser.`,
    }))
  }

  const plannerScreen = state.activeScreen === 'planner'

  return (
    <div className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Frontend only · browser storage · React</p>
          <h1>Home heat calculator</h1>
          <p>
            Save home setups in your browser, define rooms, configure the heat formula, and
            simulate heating output for each room.
          </p>
        </div>
        <nav className="tabs" aria-label="Primary">
          <button
            className={`tab ${plannerScreen ? 'active' : ''}`}
            type="button"
            onClick={() => setState((currentState) => ({ ...currentState, activeScreen: 'planner' }))}
          >
            Planner
          </button>
          <button
            className={`tab ${plannerScreen ? '' : 'active'}`}
            type="button"
            onClick={() => setState((currentState) => ({ ...currentState, activeScreen: 'settings' }))}
          >
            Settings
          </button>
        </nav>
      </header>

      <p className="status">{state.statusMessage}</p>

      {plannerScreen ? (
        <PlannerScreen
          currentSetup={state.currentSetup}
          onAddOpening={addOpening}
          onAddRoom={addRoom}
          onDeleteSetup={(setupId) =>
            setState((currentState) => ({
              ...currentState,
              savedSetups: currentState.savedSetups.filter((setup) => setup.id !== setupId),
              statusMessage: 'Removed the saved setup from this browser.',
            }))
          }
          onLoadSetup={loadSetup}
          onNewSetup={() =>
            setState((currentState) => ({
              ...currentState,
              currentSetup: createSetup(),
              statusMessage: 'Started a fresh home setup.',
            }))
          }
          onRemoveOpening={(roomId, openingId) =>
            updateRoom(roomId, (room) => ({
              ...room,
              openings: room.openings.filter((opening) => opening.id !== openingId),
            }))
          }
          onRemoveRoom={(roomId) =>
            setState((currentState) => ({
              ...currentState,
              currentSetup: {
                ...currentState.currentSetup,
                rooms: currentState.currentSetup.rooms.filter((room) => room.id !== roomId),
              },
              statusMessage: 'Removed the room from the current setup.',
            }))
          }
          onSaveSetup={saveSetup}
          onUpdateRoomField={updateRoomField}
          onUpdateSetupName={(name) =>
            setState((currentState) => ({
              ...currentState,
              currentSetup: {
                ...currentState.currentSetup,
                name,
              },
            }))
          }
          savedSetups={state.savedSetups}
          settings={state.settings}
          setupMetrics={setupMetrics}
        />
      ) : (
        <SettingsScreen
          settings={state.settings}
          onUpdateSetting={(field, value) =>
            setState((currentState) => ({
              ...currentState,
              settings: {
                ...currentState.settings,
                [field]: value,
              },
            }))
          }
        />
      )}
    </div>
  )
}

createRoot(document.querySelector('#app')).render(<App />)
