'use client'

import { useEffect, useMemo, useState } from 'react'

type Ride = {
  id: string
  name: string
  phone: string
  pickup: string
  destination: string
  car: string
  price: number
  km: number
  status: 'new' | 'accepted' | 'arrived' | 'completed'
  createdAt: string
}

const carOptions = [
  { id: 'standard', name: 'Standard', detail: '4 ulëse', rate: 1, emoji: '🚕' },
  { id: 'comfort', name: 'Comfort', detail: 'Komoditet shtesë', rate: 1.25, emoji: '🚘' },
  { id: 'electric', name: 'Electric', detail: 'Vozitje elektrike', rate: 1.5, emoji: '⚡' },
]

const euro = (n: number) => new Intl.NumberFormat('sq-XK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)

export default function Home() {
  const [view, setView] = useState<'client' | 'driver' | 'history'>('client')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pickup, setPickup] = useState('')
  const [destination, setDestination] = useState('')
  const [car, setCar] = useState('standard')
  const [rides, setRides] = useState<Ride[]>([])
  const [routeKm, setRouteKm] = useState<number | null>(null)
  const [routeMessage, setRouteMessage] = useState('')
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [message, setMessage] = useState('')
  const [completedCount, setCompletedCount] = useState(0)
  const [showReward, setShowReward] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gotaxi-rides-v1')
      if (saved) setRides(JSON.parse(saved) as Ride[])
      setCompletedCount(Number(localStorage.getItem('gotaxi-completed-v1') || 0))
    } catch {
      setRides([])
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('gotaxi-rides-v1', JSON.stringify(rides))
      localStorage.setItem('gotaxi-completed-v1', String(completedCount))
    } catch { /* local history is optional */ }
  }, [rides, completedCount])

  const selectedCar = carOptions.find((item) => item.id === car) ?? carOptions[0]
  const estimatedKm = routeKm ?? (pickup.trim() && destination.trim() ? 5 : 0)
  const estimatedPrice = estimatedKm * selectedCar.rate
  const activeRides = useMemo(() => rides.filter((ride) => ride.status !== 'completed'), [rides])
  const mapQuery = encodeURIComponent(pickup || 'Gjakovë, Kosovo')

  async function calculateRoute() {
    if (!pickup.trim() || !destination.trim()) {
      setRouteMessage('Shkruaj vendin e nisjes dhe destinacionin.')
      return
    }
    setLoadingRoute(true)
    setRouteMessage('')
    setRouteKm(null)
    const controller = new AbortController()
    try {
      const lookup = async (address: string) => {
        const params = new URLSearchParams({ q: address + ', Gjakovë, Kosovo', format: 'jsonv2', limit: '1', countrycodes: 'xk' })
        const response = await fetch('https://nominatim.openstreetmap.org/search?' + params.toString(), { signal: controller.signal, headers: { Accept: 'application/json' } })
        if (!response.ok) throw new Error('Kërkimi i adresës përkohësisht nuk është i disponueshëm.')
        const results = await response.json() as Array<{ lat: string; lon: string }>
        if (!results.length) throw new Error('Nuk u gjet kjo adresë. Provo emrin e një rruge ose pike referimi në Gjakovë.')
        return results[0]
      }
      const [from, to] = await Promise.all([lookup(pickup), lookup(destination)])
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`, { signal: controller.signal })
      if (!response.ok) throw new Error('Llogaritja e rrugës dështoi. Provo përsëri.')
      const data = await response.json() as { code: string; routes?: Array<{ distance: number }> }
      if (data.code !== 'Ok' || !data.routes?.length) throw new Error('Nuk u gjet rrugë me veturë mes këtyre adresave.')
      const km = data.routes[0].distance / 1000
      setRouteKm(km)
      setRouteMessage(`Rruga e gjetur: ${km.toFixed(1)} km. Çmimi është vlerësim.`)
    } catch (error) {
      setRouteMessage(error instanceof Error ? error.message : 'Gabim gjatë kërkimit të rrugës.')
    } finally {
      setLoadingRoute(false)
    }
  }

  function bookRide() {
    if (!name.trim() || !phone.trim() || !pickup.trim() || !destination.trim()) {
      setMessage('Plotëso emrin, telefonin, nisjen dhe destinacionin.')
      return
    }
    const km = routeKm ?? estimatedKm
    if (!km) {
      setMessage('Së pari shkruaj adresat e udhëtimit.')
      return
    }
    const ride: Ride = {
      id: 'GT-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      name: name.trim(),
      phone: phone.trim(),
      pickup: pickup.trim(),
      destination: destination.trim(),
      car: selectedCar.name,
      price: Math.max(1, km * selectedCar.rate),
      km,
      status: 'new',
      createdAt: new Date().toISOString(),
    }
    setRides((current) => [ride, ...current])
    setMessage('Rezervimi u ruajt në këtë pajisje. Kodi yt: ' + ride.id)
    setView('history')
  }

  function updateRide(id: string, status: Ride['status']) {
    setRides((current) => current.map((ride) => ride.id === id ? { ...ride, status } : ride))
    if (status === 'completed') {
      setCompletedCount((count) => {
        const next = count + 1
        if (next % 20 === 0) setShowReward(true)
        return next
      })
    }
  }

  return (
    <main className="min-h-screen bg-[#070b12] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col md:flex-row">
        <aside className="w-full border-b border-emerald-400/20 bg-[#0d131d] p-5 md:min-h-screen md:w-[390px] md:shrink-0 md:border-b-0 md:border-r md:p-7">
          <header className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-2xl text-black">🚕</div>
            <div>
              <p className="text-xl font-black tracking-tight">GO TAXI <span className="text-lime-300">GJAKOVA</span></p>
              <p className="text-xs text-slate-400">Udhëto lehtë. Udhëto sigurt.</p>
            </div>
          </header>

          <nav className="mb-7 grid grid-cols-3 gap-2">
            {([{ id: 'client', label: 'Rezervo' }, { id: 'driver', label: 'Shoferi' }, { id: 'history', label: 'Udhëtimet' }] as const).map((item) => (
              <button key={item.id} onClick={() => { setView(item.id); setMessage('') }} className={`rounded-xl px-2 py-3 text-sm font-bold transition ${view === item.id ? 'bg-lime-300 text-black' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                {item.label}
              </button>
            ))}
          </nav>

          {view === 'client' && <section className="space-y-5">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[.2em] text-lime-300">Rezervim i shpejtë</p>
              <h1 className="text-2xl font-extrabold">Ku po shkojmë?</h1>
            </div>
            <label className="block text-sm text-slate-300">Emri dhe mbiemri
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Shkruaj emrin" autoComplete="name" className="mt-2 w-full rounded-xl border border-white/10 bg-[#070b12] px-4 py-3 text-white outline-none focus:border-lime-300" />
            </label>
            <label className="block text-sm text-slate-300">Numri i telefonit
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+383 ..." type="tel" autoComplete="tel" className="mt-2 w-full rounded-xl border border-white/10 bg-[#070b12] px-4 py-3 text-white outline-none focus:border-lime-300" />
            </label>
            <label className="block text-sm text-slate-300">Vendi i nisjes
              <input value={pickup} onChange={(e) => { setPickup(e.target.value); setRouteKm(null) }} placeholder="p.sh. Çarshia e Madhe" className="mt-2 w-full rounded-xl border border-white/10 bg-[#070b12] px-4 py-3 text-white outline-none focus:border-lime-300" />
            </label>
            <label className="block text-sm text-slate-300">Destinacioni
              <input value={destination} onChange={(e) => { setDestination(e.target.value); setRouteKm(null) }} placeholder="p.sh. Spitali i Gjakovës" className="mt-2 w-full rounded-xl border border-white/10 bg-[#070b12] px-4 py-3 text-white outline-none focus:border-lime-300" />
            </label>
            <button onClick={calculateRoute} disabled={loadingRoute} className="w-full rounded-xl border border-lime-300/40 px-4 py-3 font-bold text-lime-200 hover:bg-lime-300/10 disabled:opacity-50">{loadingRoute ? 'Po llogaritet rruga…' : '⌖ Llogarit rrugën reale'}</button>
            {routeMessage && <p role="status" className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{routeMessage}</p>}
            <div>
              <p className="mb-3 text-sm font-semibold text-slate-300">Zgjedh veturën</p>
              <div className="space-y-2">{carOptions.map((option) => (
                <button key={option.id} onClick={() => setCar(option.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${car === option.id ? 'border-lime-300 bg-lime-300/10' : 'border-white/10 bg-white/[.02]'}`}>
                  <span className="text-2xl">{option.emoji}</span><span className="flex-1"><span className="block font-bold">{option.name}</span><span className="text-xs text-slate-400">{option.detail}</span></span><span className="text-sm font-bold text-lime-200">€{option.rate.toFixed(2)}/km</span>
                </button>
              ))}</div>
            </div>
            <div className="rounded-2xl border border-lime-300/20 bg-lime-300/5 p-4">
              <div className="flex items-center justify-between text-sm text-slate-300"><span>Distanca</span><span>{estimatedKm ? estimatedKm.toFixed(1) + ' km' : '—'}</span></div>
              <div className="mt-2 flex items-center justify-between"><span className="font-semibold">Çmimi i vlerësuar</span><span className="text-2xl font-black text-lime-300">{estimatedKm ? euro(estimatedPrice) : '—'}</span></div>
              <p className="mt-2 text-xs text-slate-400">Tarifa fillestare: €1/km për Standard. Çmimi final konfirmohet nga shoferi.</p>
            </div>
            <button onClick={bookRide} className="w-full rounded-xl bg-lime-300 px-4 py-4 font-black text-black transition hover:bg-lime-200">🚕 REZERVO TAKSINË</button>
            {message && <p role="status" className="rounded-xl border border-lime-300/20 bg-lime-300/10 p-3 text-sm text-lime-100">{message}</p>}
          </section>}

          {view === 'driver' && <section>
            <p className="mb-1 text-xs font-bold uppercase tracking-[.2em] text-lime-300">Paneli i shoferit</p>
            <h2 className="mb-2 text-2xl font-extrabold">Porositë aktive</h2>
            <p className="mb-5 text-sm text-slate-400">Këtu shfaqen rezervimet e ruajtura në këtë shfletues.</p>
            {activeRides.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-slate-400">Nuk ka porosi aktive për momentin.</div> : activeRides.map((ride) => <div key={ride.id} className="mb-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <div className="flex justify-between gap-3"><span className="font-bold">{ride.name}</span><span className="text-sm font-bold text-lime-300">{euro(ride.price)}</span></div>
              <p className="mt-1 text-xs text-slate-400">{ride.id} · {ride.phone}</p>
              <p className="mt-3 text-sm">📍 {ride.pickup}</p><p className="mt-1 text-sm">🏁 {ride.destination}</p>
              <p className="mt-2 text-xs text-slate-400">{ride.car} · {ride.km.toFixed(1)} km</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {ride.status === 'new' && <button onClick={() => updateRide(ride.id, 'accepted')} className="rounded-lg bg-lime-300 px-3 py-2 text-sm font-bold text-black">Pranova — po vij</button>}
                {ride.status === 'accepted' && <button onClick={() => updateRide(ride.id, 'arrived')} className="rounded-lg bg-sky-300 px-3 py-2 text-sm font-bold text-black">Arrita te klienti</button>}
                {ride.status === 'arrived' && <button onClick={() => updateRide(ride.id, 'completed')} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-black">Përfundo udhëtimin</button>}
              </div>
            </div>)}
          </section>}

          {view === 'history' && <section>
            <p className="mb-1 text-xs font-bold uppercase tracking-[.2em] text-lime-300">Historiku</p>
            <h2 className="mb-2 text-2xl font-extrabold">Udhëtimet e tua</h2>
            <p className="mb-5 text-sm text-slate-400">Udhëtimet ruhen lokalisht në këtë pajisje.</p>
            {rides.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-slate-400">Ende nuk ka rezervime. Kthehu te “Rezervo”.</div> : rides.map((ride) => <article key={ride.id} className="mb-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <div className="flex items-center justify-between gap-3"><span className="font-bold">{ride.id}</span><span className="font-bold text-lime-300">{euro(ride.price)}</span></div>
              <p className="mt-2 text-sm">{ride.pickup} → {ride.destination}</p>
              <p className="mt-2 text-xs text-slate-400">{ride.car} · {ride.km.toFixed(1)} km · {ride.status === 'new' ? 'Në pritje' : ride.status === 'accepted' ? 'Shoferi po vjen' : ride.status === 'arrived' ? 'Shoferi arriti' : 'Përfunduar'}</p>
            </article>)}
            <div className="mt-5 rounded-2xl bg-white/5 p-4"><p className="text-sm text-slate-400">Udhëtime të përfunduara</p><p className="text-3xl font-black text-lime-300">{completedCount}</p><p className="mt-1 text-xs text-slate-400">Rrota shpërblyese pas çdo 20 udhëtimeve të përfunduara.</p></div>
          </section>}
        </aside>

        <section className="flex min-h-[550px] flex-1 flex-col p-5 md:min-h-screen md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-sm font-bold uppercase tracking-[.2em] text-lime-300">Shërbimi lokal</p><h2 className="mt-1 text-3xl font-black md:text-4xl">Taksi në Gjakovë.</h2><p className="mt-2 text-slate-400">Rezervo udhëtimin tënd brenda pak çastesh.</p></div>
            <div className="rounded-full border border-lime-300/20 bg-lime-300/10 px-4 py-2 text-sm font-semibold text-lime-200"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-lime-300" /> Gjakovë, Kosovë</div>
          </div>
          <div className="relative min-h-[330px] flex-1 overflow-hidden rounded-3xl border border-white/10 bg-[#111a25]">
            <iframe title="Harta e Gjakovës" src={`https://www.openstreetmap.org/export/embed.html?bbox=20.33%2C42.36%2C20.48%2C42.43&layer=mapnik&marker=42.38%2C20.43`} className="absolute inset-0 h-full min-h-[330px] w-full border-0" loading="lazy" />
            <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-white/10 bg-[#0d131d]/95 p-4 shadow-xl backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-widest text-lime-300">Go Taxi</p><p className="mt-1 font-bold">Gjakova dhe rrethina</p><p className="mt-1 text-xs text-slate-400">Harta OpenStreetMap</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><p className="text-2xl">📍</p><p className="mt-2 font-bold">Nisja dhe destinacioni</p><p className="mt-1 text-sm text-slate-400">Llogaritja e rrugës përmes hartës.</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><p className="text-2xl">💶</p><p className="mt-2 font-bold">Çmim i qartë</p><p className="mt-1 text-sm text-slate-400">Vlerësim sipas kilometrave.</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><p className="text-2xl">🚖</p><p className="mt-2 font-bold">Paneli i shoferit</p><p className="mt-1 text-sm text-slate-400">Prano dhe përfundo udhëtimet.</p></div>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-slate-500">Shënim: Ky version është prototip funksional në shfletues. Rezervimet ruhen në këtë pajisje dhe nuk dërgohen automatikisht te shoferët në pajisje të tjera. Për shërbim publik real duhet databazë dhe sistem njoftimesh në server.</p>
        </section>
      </div>
      {showReward && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5"><div className="w-full max-w-sm rounded-3xl border border-lime-300/30 bg-[#0d131d] p-8 text-center"><div className="text-5xl">🎉</div><h2 className="mt-4 text-2xl font-black">Urime!</h2><p className="mt-2 text-slate-300">Ke përfunduar 20 udhëtime. Shpërblimi yt mund të aktivizohet nga administratori.</p><button onClick={() => setShowReward(false)} className="mt-6 w-full rounded-xl bg-lime-300 px-4 py-3 font-bold text-black">Në rregull</button></div></div>}
    </main>
  )
}
