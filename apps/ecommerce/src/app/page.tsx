import Link from 'next/link'

const FEATURES = [
  { icon: '🎟️', title: 'Trampoline Park', desc: 'Jump Arena with 50 person capacity' },
  { icon: '🎯', title: 'Laser Tag', desc: 'Immersive combat arena for groups' },
  { icon: '🧩', title: 'Escape Room', desc: '60-minute puzzle challenges' },
  { icon: '🦁', title: 'Mini Zoo', desc: 'Up-close wildlife encounters' },
  { icon: '💦', title: 'Water Park', desc: 'Slides and wave pool' },
  { icon: '🎮', title: 'Arcade', desc: 'Classic and modern games' },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white py-24 px-4">
        <div className="container-page text-center">
          <h1 className="text-5xl lg:text-6xl font-black leading-tight">
            Where Every Day Is <span className="text-yellow-400">Fun Day</span>
          </h1>
          <p className="mt-4 text-indigo-200 text-xl max-w-2xl mx-auto">
            India's premier family entertainment centre. Book tickets online and skip the queue!
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/tickets" className="btn-primary text-lg px-8 py-4 rounded-xl">
              Book Tickets
            </Link>
            <Link
              href="/memberships"
              className="btn bg-white/10 hover:bg-white/20 text-white border border-white/30 px-8 py-4 rounded-xl text-lg"
            >
              View Memberships
            </Link>
          </div>
        </div>
      </section>

      {/* Attractions */}
      <section className="py-20 px-4">
        <div className="container-page">
          <h2 className="text-3xl font-black text-center mb-2">Attractions</h2>
          <p className="text-center text-gray-500 mb-10">Something for everyone in the family</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-indigo-100 transition-all"
              >
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-lg">{f.title}</h3>
                <p className="text-gray-500 text-sm mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership CTA */}
      <section className="bg-indigo-50 py-16 px-4">
        <div className="container-page text-center">
          <h2 className="text-3xl font-black">Visit More. Pay Less.</h2>
          <p className="text-gray-600 mt-2 mb-8 max-w-xl mx-auto">
            FunZone members get up to 20% off tickets, priority booking, and monthly visit
            allowances.
          </p>
          <Link href="/memberships" className="btn-primary rounded-xl">
            Explore Memberships
          </Link>
        </div>
      </section>
    </>
  )
}
