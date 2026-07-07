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

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

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

let state = hydrateState()
const app = document.querySelector('#app')

const persistState = () => {
  saveSavedSetups(state.savedSetups)
  saveDraft({
    activeScreen: state.activeScreen,
    currentSetup: state.currentSetup,
    settings: state.settings,
    statusMessage: state.statusMessage,
  })
}

const setState = (updater) => {
  state = updater(state)
  persistState()
  render()
}

const formatWatts = (value) => `${Math.round(value).toLocaleString()} W`
const formatSquareMeters = (value) => `${value.toFixed(1)} m²`
const formatCubicMeters = (value) => `${value.toFixed(1)} m³`

const getBalanceLabel = (balance) => {
  if (balance >= 0) {
    return 'covers the required heat output'
  }

  return 'needs additional heating capacity'
}

const getRoomCard = (room) => {
  const metrics = calculateRoomMetrics(room, state.settings)
  const balanceClass = metrics.heatBalance >= 0 ? 'positive' : 'negative'
  const openings = Array.isArray(room.openings) ? room.openings : []

  return `
    <article class="card room-card">
      <div class="card-header">
        <div>
          <h3>${escapeHtml(room.name || 'Unnamed room')}</h3>
          <p>${formatWatts(metrics.requiredHeat)} required · ${formatWatts(metrics.totalHeatProduction)} simulated</p>
        </div>
        <button class="button secondary" data-action="remove-room" data-room-id="${room.id}">Delete room</button>
      </div>

      <div class="room-grid">
        <label>
          Room name
          <input data-action="update-room-field" data-room-id="${room.id}" data-field="name" value="${escapeHtml(room.name)}" />
        </label>
        <label>
          Length (m)
          <input type="number" min="0" step="0.1" data-action="update-room-field" data-room-id="${room.id}" data-field="length" value="${room.length}" />
        </label>
        <label>
          Width (m)
          <input type="number" min="0" step="0.1" data-action="update-room-field" data-room-id="${room.id}" data-field="width" value="${room.width}" />
        </label>
        <label>
          Height (m)
          <input type="number" min="0" step="0.1" data-action="update-room-field" data-room-id="${room.id}" data-field="height" value="${room.height}" />
        </label>
      </div>

      <div class="stats-grid">
        <div>
          <span>Volume</span>
          <strong>${formatCubicMeters(metrics.volume)}</strong>
        </div>
        <div>
          <span>Floor area</span>
          <strong>${formatSquareMeters(metrics.floorArea)}</strong>
        </div>
        <div>
          <span>Openings</span>
          <strong>${formatSquareMeters(metrics.windowArea + metrics.doorArea)}</strong>
        </div>
        <div class="${balanceClass}">
          <span>Balance</span>
          <strong>${formatWatts(metrics.heatBalance)}</strong>
          <small>${getBalanceLabel(metrics.heatBalance)}</small>
        </div>
      </div>

      <section class="subsection">
        <div class="section-header">
          <div>
            <h4>Heating simulation</h4>
            <p>Compare floor heating and central heating output to the required room heat.</p>
          </div>
        </div>
        <div class="room-grid">
          <label>
            Floor heating coverage (%)
            <input type="number" min="0" max="100" step="1" data-action="update-room-field" data-room-id="${room.id}" data-field="floorHeatingCoverage" value="${room.floorHeatingCoverage}" />
          </label>
          <label>
            Central heating units
            <input type="number" min="0" step="1" data-action="update-room-field" data-room-id="${room.id}" data-field="centralHeatingUnits" value="${room.centralHeatingUnits}" />
          </label>
        </div>
        <div class="stats-grid compact">
          <div>
            <span>Floor heating output</span>
            <strong>${formatWatts(metrics.floorHeatingOutput)}</strong>
          </div>
          <div>
            <span>Central heating output</span>
            <strong>${formatWatts(metrics.centralHeatingOutput)}</strong>
          </div>
        </div>
      </section>

      <section class="subsection">
        <div class="section-header">
          <div>
            <h4>Doors and windows</h4>
            <p>Add each opening to factor extra heat loss into the room requirement.</p>
          </div>
        </div>
        <ul class="opening-list">
          ${
            openings.length
              ? openings
                  .map(
                    (opening) => `
                      <li>
                        <div>
                          <strong>${escapeHtml(opening.name || 'Opening')}</strong>
                          <span>${escapeHtml(opening.type)} · ${opening.count} × ${opening.width} m × ${opening.height} m</span>
                        </div>
                        <div class="opening-actions">
                          <span>${formatSquareMeters(calculateOpeningArea(opening))}</span>
                          <button class="button ghost" data-action="remove-opening" data-room-id="${room.id}" data-opening-id="${opening.id}">Remove</button>
                        </div>
                      </li>
                    `,
                  )
                  .join('')
              : '<li class="empty-state">No doors or windows added yet.</li>'
          }
        </ul>
        <form class="inline-form" data-action="add-opening" data-room-id="${room.id}">
          <label>
            Type
            <select name="type">
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
            <input type="number" min="0" step="0.1" name="width" value="1" required />
          </label>
          <label>
            Height (m)
            <input type="number" min="0" step="0.1" name="height" value="1" required />
          </label>
          <label>
            Count
            <input type="number" min="1" step="1" name="count" value="1" required />
          </label>
          <button class="button" type="submit">Add opening</button>
        </form>
      </section>
    </article>
  `
}

const render = () => {
  const setupMetrics = calculateSetupMetrics(state.currentSetup, state.settings)
  const totalBalance = setupMetrics.totalHeatProduction - setupMetrics.totalRequiredHeat
  const totalBalanceClass = totalBalance >= 0 ? 'positive' : 'negative'

  app.innerHTML = `
    <div class="shell">
      <header class="hero">
        <div>
          <p class="eyebrow">Frontend only · browser storage</p>
          <h1>Home heat calculator</h1>
          <p>Save home setups in your browser, define rooms, configure the heat formula, and simulate heating output for each room.</p>
        </div>
        <nav class="tabs" aria-label="Primary">
          <button class="tab ${state.activeScreen === 'planner' ? 'active' : ''}" data-action="show-screen" data-screen="planner">Planner</button>
          <button class="tab ${state.activeScreen === 'settings' ? 'active' : ''}" data-action="show-screen" data-screen="settings">Settings</button>
        </nav>
      </header>

      <p class="status">${escapeHtml(state.statusMessage)}</p>

      ${
        state.activeScreen === 'planner'
          ? `
            <section class="grid">
              <article class="card">
                <div class="card-header">
                  <div>
                    <h2>Current home setup</h2>
                    <p>Everything persists to localStorage on this browser only.</p>
                  </div>
                  <div class="button-row">
                    <button class="button secondary" data-action="new-setup">New setup</button>
                    <button class="button" data-action="save-setup">Save setup</button>
                  </div>
                </div>

                <label>
                  Home setup name
                  <input data-action="update-setup-name" value="${escapeHtml(state.currentSetup.name)}" />
                </label>

                <div class="stats-grid">
                  <div>
                    <span>Rooms</span>
                    <strong>${state.currentSetup.rooms.length}</strong>
                  </div>
                  <div>
                    <span>Total volume</span>
                    <strong>${formatCubicMeters(setupMetrics.totalVolume)}</strong>
                  </div>
                  <div>
                    <span>Total required heat</span>
                    <strong>${formatWatts(setupMetrics.totalRequiredHeat)}</strong>
                  </div>
                  <div class="${totalBalanceClass}">
                    <span>Simulated balance</span>
                    <strong>${formatWatts(totalBalance)}</strong>
                    <small>${getBalanceLabel(totalBalance)}</small>
                  </div>
                </div>
              </article>

              <article class="card">
                <div class="card-header">
                  <div>
                    <h2>Saved setups</h2>
                    <p>Load or remove previously saved home definitions.</p>
                  </div>
                </div>
                <ul class="saved-list">
                  ${
                    state.savedSetups.length
                      ? state.savedSetups
                          .map(
                            (setup) => `
                              <li>
                                <div>
                                  <strong>${escapeHtml(setup.name)}</strong>
                                  <span>${setup.rooms.length} room(s)</span>
                                </div>
                                <div class="button-row">
                                  <button class="button ghost" data-action="load-setup" data-setup-id="${setup.id}">Load</button>
                                  <button class="button ghost" data-action="delete-setup" data-setup-id="${setup.id}">Delete</button>
                                </div>
                              </li>
                            `,
                          )
                          .join('')
                      : '<li class="empty-state">No saved home setups yet.</li>'
                  }
                </ul>
              </article>
            </section>

            <section class="card add-room-card">
              <div class="card-header">
                <div>
                  <h2>Rooms</h2>
                  <p>Create rooms with dimensions, then add openings and heating elements.</p>
                </div>
              </div>
              <form class="inline-form" data-action="add-room">
                <label>
                  Name
                  <input name="name" placeholder="Living room" required />
                </label>
                <label>
                  Length (m)
                  <input type="number" min="0" step="0.1" name="length" value="5" required />
                </label>
                <label>
                  Width (m)
                  <input type="number" min="0" step="0.1" name="width" value="4" required />
                </label>
                <label>
                  Height (m)
                  <input type="number" min="0" step="0.1" name="height" value="2.4" required />
                </label>
                <button class="button" type="submit">Add room</button>
              </form>
            </section>

            <section class="room-list">
              ${state.currentSetup.rooms.length ? state.currentSetup.rooms.map(getRoomCard).join('') : '<article class="card empty-state large">Add your first room to start calculating heat requirements.</article>'}
            </section>
          `
          : `
            <section class="card settings-card">
              <div class="card-header">
                <div>
                  <h2>Heat formula settings</h2>
                  <p>Adjust these defaults to match the heat formula you want to use for all rooms.</p>
                </div>
              </div>
              <div class="room-grid">
                <label>
                  Base watts per cubic meter
                  <input type="number" min="0" step="1" data-action="update-setting" data-field="wattsPerCubicMeter" value="${state.settings.wattsPerCubicMeter}" />
                </label>
                <label>
                  Window heat loss per square meter
                  <input type="number" min="0" step="1" data-action="update-setting" data-field="windowLossPerSquareMeter" value="${state.settings.windowLossPerSquareMeter}" />
                </label>
                <label>
                  Door heat loss per square meter
                  <input type="number" min="0" step="1" data-action="update-setting" data-field="doorLossPerSquareMeter" value="${state.settings.doorLossPerSquareMeter}" />
                </label>
                <label>
                  Floor heating watts per square meter
                  <input type="number" min="0" step="1" data-action="update-setting" data-field="floorHeatingWattsPerSquareMeter" value="${state.settings.floorHeatingWattsPerSquareMeter}" />
                </label>
                <label>
                  Central heating watts per unit
                  <input type="number" min="0" step="1" data-action="update-setting" data-field="centralHeatingWattsPerUnit" value="${state.settings.centralHeatingWattsPerUnit}" />
                </label>
              </div>
              <article class="callout">
                <h3>Default formula</h3>
                <p>Required heat = room volume × base watts/m³ + window area × window loss + door area × door loss.</p>
                <p>Simulated heat production = heated floor area × floor heating watts/m² + central heating units × watts per unit.</p>
              </article>
            </section>
          `
      }
    </div>
  `
}

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

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]')

  if (!target) {
    return
  }

  const { action } = target.dataset

  if (action === 'show-screen') {
    setState((currentState) => ({
      ...currentState,
      activeScreen: target.dataset.screen,
    }))
  }

  if (action === 'new-setup') {
    setState((currentState) => ({
      ...currentState,
      currentSetup: createSetup(),
      statusMessage: 'Started a fresh home setup.',
    }))
  }

  if (action === 'save-setup') {
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

  if (action === 'load-setup') {
    const setup = state.savedSetups.find((entry) => entry.id === target.dataset.setupId)

    if (!setup) {
      return
    }

    setState((currentState) => ({
      ...currentState,
      currentSetup: normalizeSetup(cloneData(setup)),
      statusMessage: `Loaded "${setup.name}" from this browser.`,
    }))
  }

  if (action === 'delete-setup') {
    setState((currentState) => ({
      ...currentState,
      savedSetups: currentState.savedSetups.filter((setup) => setup.id !== target.dataset.setupId),
      statusMessage: 'Removed the saved setup from this browser.',
    }))
  }

  if (action === 'remove-room') {
    setState((currentState) => ({
      ...currentState,
      currentSetup: {
        ...currentState.currentSetup,
        rooms: currentState.currentSetup.rooms.filter((room) => room.id !== target.dataset.roomId),
      },
      statusMessage: 'Removed the room from the current setup.',
    }))
  }

  if (action === 'remove-opening') {
    updateRoom(target.dataset.roomId, (room) => ({
      ...room,
      openings: room.openings.filter((opening) => opening.id !== target.dataset.openingId),
    }))
  }
})

app.addEventListener('change', (event) => {
  const target = event.target
  const action = target.dataset.action

  if (action === 'update-setup-name') {
    setState((currentState) => ({
      ...currentState,
      currentSetup: {
        ...currentState.currentSetup,
        name: target.value,
      },
    }))
  }

  if (action === 'update-setting') {
    setState((currentState) => ({
      ...currentState,
      settings: {
        ...currentState.settings,
        [target.dataset.field]: Number(target.value),
      },
    }))
  }

  if (action === 'update-room-field') {
    updateRoom(target.dataset.roomId, (room) => ({
      ...room,
      [target.dataset.field]: target.type === 'number' ? Number(target.value) : target.value,
    }))
  }
})

app.addEventListener('submit', (event) => {
  event.preventDefault()
  const form = event.target
  const action = form.dataset.action
  const formData = new FormData(form)

  if (action === 'add-room') {
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
    return
  }

  if (action === 'add-opening') {
    const roomId = form.dataset.roomId
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
})

render()
