export const metadata = {
  title: 'Plan Your Visit — FunZone',
}

const TIPS = [
  { icon: '⏰', title: 'Best time to visit', body: 'Weekday mornings (10am–12pm) are the least crowded. Weekends after 3pm are peak hours.' },
  { icon: '🎟️', title: 'Book online & save', body: 'Online ticket prices are 5–10% lower than walk-in. Book at least a day in advance for the best availability.' },
  { icon: '🍔', title: 'Food & Drinks', body: 'Our food court offers burgers, beverages, desserts, and more. Top up your wallet for faster checkout inside.' },
  { icon: '🅿️', title: 'Parking', body: 'Free parking for 3 hours. Valet available on weekends. Gate 2 has closest access to the main entrance.' },
  { icon: '👶', title: 'With young children', body: 'Soft Play Zone and Mini Zoo are perfect for toddlers. No booking required for these open-access areas.' },
  { icon: '📱', title: 'Download the app', body: 'Get live wait times, mobile tickets, and wallet top-ups via the FunZone app. Available on iOS and Android.' },
]

export default function PlanPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-black mb-2">Plan Your Visit</h1>
      <p className="text-gray-500 mb-10">Everything you need to know for an awesome day out</p>

      {/* Opening hours */}
      <div className="bg-indigo-50 rounded-2xl p-6 mb-10 grid sm:grid-cols-3 gap-6 text-center">
        <div>
          <p className="text-sm text-gray-500 font-medium">Weekdays</p>
          <p className="text-2xl font-black text-indigo-700 mt-1">10am – 8pm</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">Weekends</p>
          <p className="text-2xl font-black text-indigo-700 mt-1">9am – 9pm</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">Public Holidays</p>
          <p className="text-2xl font-black text-indigo-700 mt-1">9am – 10pm</p>
        </div>
      </div>

      {/* Tips */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TIPS.map((tip) => (
          <div key={tip.title} className="border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow">
            <p className="text-3xl mb-3">{tip.icon}</p>
            <h3 className="font-bold text-gray-900">{tip.title}</h3>
            <p className="text-sm text-gray-500 mt-2">{tip.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
