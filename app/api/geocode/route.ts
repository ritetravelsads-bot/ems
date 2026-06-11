import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng parameters' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Infobirth-EMS/1.0',
        },
        next: { revalidate: 86400 }, // Cache for 24 hours
      }
    )

    if (!response.ok) {
      throw new Error('Geocoding service unavailable')
    }

    const data = await response.json()

    const address = data.address || {}
    const parts: string[] = []

    if (address.road || address.pedestrian || address.footway) {
      parts.push(address.road || address.pedestrian || address.footway)
    }
    if (address.neighbourhood || address.suburb) {
      parts.push(address.neighbourhood || address.suburb)
    }
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village)
    }
    if (address.state) {
      parts.push(address.state)
    }
    if (address.postcode) {
      parts.push(address.postcode)
    }
    if (address.country) {
      parts.push(address.country)
    }

    const formattedAddress = parts.length > 0 ? parts.join(', ') : data.display_name || 'Address not found'

    return NextResponse.json({
      address: formattedAddress,
      displayName: data.display_name,
      details: address,
    })
  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json({ error: 'Failed to geocode location', address: null }, { status: 500 })
  }
}
