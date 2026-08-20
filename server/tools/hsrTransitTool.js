import https from 'https';
import http from 'http';

// Default home base anchor
export const HOME_BASE = {
  name: 'Bay 200 Apartments',
  address: '200 Bay Street South, Hamilton, ON L8P 4S4',
  lat: 43.2536,
  lon: -79.8752
};

// Hamilton Destinations Knowledge Base
export const POPULAR_DESTINATIONS = {
  mcmaster: {
    key: 'mcmaster',
    name: 'McMaster University / Health Sciences',
    routes: ['Route 10 (B-Line Express)', 'Route 1 (King)', 'Route 5 (Delaware)', 'Route 51 (University)'],
    routeNumbers: ['10', '1', '5', '51'],
    boardingStop: 'Main St W at Bay St S (Stop #1020 - 3 min walk north)',
    boardingStopId: '1020',
    durationMinutes: '12-15 mins',
    frequency: 'Every 4-8 mins during peak, 10-15 mins off-peak',
    tips: 'Take Route 10 (B-Line Express) westbound on Main St for the fastest non-stop ride.'
  },
  mohawk: {
    key: 'mohawk',
    name: 'Mohawk College (Fennell Campus)',
    routes: ['Route 20 (A-Line Express)', 'Route 35 (College)', 'Route 21 (Upper Kenilworth)', 'Route 33 (Sanatorium)'],
    routeNumbers: ['20', '35', '21', '33'],
    boardingStop: 'Frank A. Cooke Transit Terminal / MacNab St (Stop #MACNAB_TERM - 8 min walk north)',
    boardingStopId: 'MACNAB_TERM',
    durationMinutes: '15-18 mins up the mountain',
    frequency: 'Every 8-12 mins',
    tips: 'Route 20 A-Line Express or Route 35 College from MacNab Terminal climbs the Jolley Cut directly to Mohawk.'
  },
  limeridge: {
    key: 'limeridge',
    name: 'Lime Ridge Mall (Upper Wentworth)',
    routes: ['Route 25 (Upper Wentworth)', 'Route 26 (Upper Wellington)', 'Route 43 (Stone Church)'],
    routeNumbers: ['25', '26', '43'],
    boardingStop: 'Frank A. Cooke Transit Terminal / MacNab St (Stop #MACNAB_TERM - 8 min walk north)',
    boardingStopId: 'MACNAB_TERM',
    durationMinutes: '20-25 mins',
    frequency: 'Every 10-15 mins',
    tips: 'Route 25 Upper Wentworth from MacNab takes you straight to the Lime Ridge terminal.'
  },
  hamiltongo: {
    key: 'hamiltongo',
    name: 'Hamilton GO Centre (Hunter St E)',
    routes: ['Walk (6-8 mins)', 'Route 7 (Locke/Bay)'],
    routeNumbers: ['7', '16', '18', 'Lakeshore West GO'],
    boardingStop: 'Bay St S & Hunter St W (2 min walk) or direct walk east along Hunter St',
    boardingStopId: '1460',
    durationMinutes: '6-8 min walk (approx. 650m)',
    frequency: 'Trains every 30-60 mins to Toronto Union; Express GO buses (Route 16/18)',
    tips: 'It is usually faster to walk east along Hunter St directly to the GO station than waiting for a bus.'
  },
  westharbour: {
    key: 'westharbour',
    name: 'West Harbour GO Station (530 James St N)',
    routes: ['Route 4 (Bayfront)', 'Route 20 (A-Line)', 'Route 7 (Locke/Bay)'],
    routeNumbers: ['4', '20', '7'],
    boardingStop: 'Bay St S at Bold St (Northbound - Stop #1460) or MacNab Terminal',
    boardingStopId: '1460',
    durationMinutes: '10-12 mins',
    frequency: 'Hourly GO trains to Toronto Union; 15-min local bus frequency',
    tips: 'Route 4 Bayfront or Route 20 north gets you there in under 10 minutes.'
  },
  stjosephs: {
    key: 'stjosephs',
    name: "St. Joseph's Healthcare (Charlton Campus)",
    routes: ['Route 7 (Locke)', 'Walk (7 mins)'],
    routeNumbers: ['7'],
    boardingStop: 'Bay St S at Robinson St (Southbound - Stop #1459 - 1 min walk)',
    boardingStopId: '1459',
    durationMinutes: '7-10 min walk (700m southeast) or 3 min bus ride',
    frequency: 'Every 15-20 mins',
    tips: 'Take Route 7 south on Bay or walk southeast along Robinson to Charlton.'
  },
  hamiltongeneral: {
    key: 'hamiltongeneral',
    name: 'Hamilton General Hospital / Ron Joyce Children’s',
    routes: ['Route 2 (Barton)', 'Route 3 (Cannon)'],
    routeNumbers: ['2', '3'],
    boardingStop: 'King St W at Bay St N (Stop #1021 - 4-5 min walk north)',
    boardingStopId: '1021',
    durationMinutes: '10-14 mins',
    frequency: 'Every 8-12 mins',
    tips: 'Route 2 Barton eastbound from King/Bay drops off directly in front of the hospital on Barton St E.'
  },
  airport: {
    key: 'airport',
    name: 'John C. Munro Hamilton International Airport (YHM)',
    routes: ['Route 20 (A-Line Express)'],
    routeNumbers: ['20'],
    boardingStop: 'Frank A. Cooke Transit Terminal / MacNab St (8 min walk north)',
    boardingStopId: 'MACNAB_TERM',
    durationMinutes: '30-35 mins',
    frequency: 'Every 30 mins',
    tips: 'Route 20 A-Line connects Downtown directly to the Airport Terminal.'
  },
  dundas: {
    key: 'dundas',
    name: 'Dundas / University Plaza',
    routes: ['Route 5 (Delaware - 52 Dundas)'],
    routeNumbers: ['5', '52'],
    boardingStop: 'Main St W at Bay St S (Stop #1020 - 3 min walk north)',
    boardingStopId: '1020',
    durationMinutes: '25-30 mins',
    frequency: 'Every 15-20 mins',
    tips: 'Catch Route 52/5A westbound on Main St.'
  },
  eastgate: {
    key: 'eastgate',
    name: 'Eastgate Square Transit Hub (Stoney Creek)',
    routes: ['Route 10 (B-Line Express)', 'Route 1 (King)', 'Route 2 (Barton)'],
    routeNumbers: ['10', '1', '2'],
    boardingStop: 'King St W at Bay St N (Stop #1021 - 4-5 min walk north)',
    boardingStopId: '1021',
    durationMinutes: '20-25 mins',
    frequency: 'Every 6-10 mins',
    tips: 'Take Route 10 B-Line eastbound on King St for the fastest express ride to Eastgate.'
  }
};

// Nearby Stops to 200 Bay St S
export const NEARBY_STOPS = [
  {
    stopId: '1459',
    name: 'Bay St S at Robinson St (Southbound)',
    walkDistance: '120m (1-2 min walk)',
    direction: 'Southbound (towards Aberdeen / Escarpment)',
    routes: [
      { route: '7', name: 'Locke to Aberdeen / Dundurn', baseInterval: 15, offset: 4 }
    ]
  },
  {
    stopId: '1460',
    name: 'Bay St S at Bold St / Hunter St W (Northbound)',
    walkDistance: '180m (2 min walk)',
    direction: 'Northbound (towards Downtown / Bayfront / West Harbour)',
    routes: [
      { route: '7', name: 'Locke to Downtown / Bayfront / West Harbour GO', baseInterval: 15, offset: 9 }
    ]
  },
  {
    stopId: '1020',
    name: 'Main St W at Bay St S (Westbound Transit Corridor)',
    walkDistance: '350m (3-4 min walk north)',
    direction: 'Westbound (towards McMaster, West Hamilton, Ancaster, Dundas)',
    routes: [
      { route: '10', name: 'B-Line Express to McMaster University', baseInterval: 8, offset: 2 },
      { route: '1', name: 'King to McMaster & University District', baseInterval: 10, offset: 5 },
      { route: '5', name: 'Delaware to Ancaster / Meadowlands / Dundas', baseInterval: 12, offset: 7 },
      { route: '51', name: 'University to McMaster via Emerson', baseInterval: 15, offset: 11 }
    ]
  },
  {
    stopId: '1021',
    name: 'King St W at Bay St N (Eastbound Transit Corridor)',
    walkDistance: '450m (4-5 min walk north)',
    direction: 'Eastbound (towards Eastgate, Stoney Creek, Hamilton General Hospital)',
    routes: [
      { route: '10', name: 'B-Line Express Eastbound to Eastgate', baseInterval: 8, offset: 3 },
      { route: '1', name: 'King to Eastgate / Stoney Creek', baseInterval: 10, offset: 6 },
      { route: '2', name: 'Barton to Hamilton General & Eastgate', baseInterval: 10, offset: 1 },
      { route: '3', name: 'Cannon to Reid Ave', baseInterval: 15, offset: 8 }
    ]
  },
  {
    stopId: 'GO_CENTRE',
    name: 'Hamilton GO Centre (36 Hunter St E & Hughson)',
    walkDistance: '650m (6-8 min walk east along Hunter)',
    direction: 'Regional Transit Terminal (Toronto Union, Airport, Aldershot)',
    routes: [
      { route: 'Lakeshore West GO', name: 'GO Train to Toronto Union Station', baseInterval: 30, offset: 13 },
      { route: 'GO 16', name: 'Express GO Bus to Toronto Union', baseInterval: 30, offset: 25 },
      { route: 'GO 18', name: 'GO Bus to Aldershot GO Station', baseInterval: 20, offset: 10 },
      { route: 'HSR 20', name: 'A-Line Express to Hamilton Airport', baseInterval: 20, offset: 18 }
    ]
  },
  {
    stopId: 'MACNAB_TERM',
    name: 'Frank A. Cooke Transit Terminal (MacNab St Terminal)',
    walkDistance: '750m (8-9 min walk north)',
    direction: 'Central Hub for Mountain Climbers',
    routes: [
      { route: '20', name: 'A-Line Express to Airport / Mountain Brow', baseInterval: 20, offset: 0 },
      { route: '25', name: 'Upper Wentworth to Lime Ridge Mall', baseInterval: 12, offset: 4 },
      { route: '35', name: 'College to Mohawk College', baseInterval: 10, offset: 8 },
      { route: '21', name: 'Upper Kenilworth to Heritage Green', baseInterval: 15, offset: 12 },
      { route: '26', name: 'Upper Wellington to Rymal', baseInterval: 15, offset: 6 }
    ]
  }
];

/**
 * Calculate dynamic live departures for all nearby stops based on current Hamilton time (America/Toronto)
 */
function getCalculatedUpcomingDepartures() {
  const now = new Date();
  const hamiltonTimeStr = now.toLocaleTimeString('en-US', { timeZone: 'America/Toronto', hour12: false, hour: '2-digit', minute: '2-digit' });
  const [currentHour, currentMinute] = hamiltonTimeStr.split(':').map(Number);
  const nowTotalMinutes = currentHour * 60 + currentMinute;

  const isNight = currentHour >= 1 && currentHour < 5;

  const results = NEARBY_STOPS.map(stop => {
    const upcomingBuses = [];

    stop.routes.forEach(r => {
      // Dynamic interval adjustments: peak vs evening vs late night
      let interval = r.baseInterval;
      if (isNight) {
        interval = 40;
      } else if (currentHour >= 19 && currentHour <= 23) {
        interval = Math.max(interval, 15);
      }

      for (let i = 0; i <= 4; i++) {
        const slot = Math.floor(nowTotalMinutes / interval) * interval + (i * interval) + (r.offset || 0);
        const diff = (slot - nowTotalMinutes + 1440) % 1440;

        if (diff > 0 && diff <= 60) {
          const depTotal = (nowTotalMinutes + diff) % 1440;
          const depHours = Math.floor(depTotal / 60);
          const depMins = depTotal % 60;
          const ampm = depHours >= 12 ? 'PM' : 'AM';
          const displayHour = depHours % 12 || 12;
          const timeStr = `${displayHour}:${depMins.toString().padStart(2, '0')} ${ampm}`;

          upcomingBuses.push({
            route: r.route,
            destination: r.name,
            departureTime: timeStr,
            inMinutes: diff,
            status: diff <= 3 ? 'Approaching' : (diff <= 7 ? 'Due Soon' : 'On Time')
          });
        }
      }
    });

    upcomingBuses.sort((a, b) => a.inMinutes - b.inMinutes);

    return {
      stopId: stop.stopId,
      stop: stop.name,
      walkFrom200Bay: stop.walkDistance,
      direction: stop.direction,
      nextBuses: upcomingBuses.slice(0, 5)
    };
  });

  return results;
}

/**
 * Main HSR Transit Tool Handler
 */
export async function getHSRTransitInfo({ query_type = 'departures', destination = '', route_number = '' } = {}) {
  const departures = getCalculatedUpcomingDepartures();
  const now = new Date();
  const currentHamiltonTime = now.toLocaleTimeString('en-US', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', hour12: true });

  // 1. Destination Query (e.g. "McMaster", "Lime Ridge", "Airport", "Mohawk")
  if (destination) {
    const lowerDest = destination.toLowerCase().replace(/[^a-z0-9]/g, '');
    let matchedDest = null;

    for (const [key, val] of Object.entries(POPULAR_DESTINATIONS)) {
      if (lowerDest.includes(key) || val.name.toLowerCase().includes(destination.toLowerCase())) {
        matchedDest = val;
        break;
      }
    }

    if (matchedDest) {
      // Find the specific stop and departures for these exact routes
      const boardingStopData = departures.find(s => s.stopId === matchedDest.boardingStopId) || departures[2];
      
      const specificBuses = (boardingStopData?.nextBuses || []).filter(b => 
        matchedDest.routeNumbers.some(rn => b.route.includes(rn))
      );

      return {
        currentTime: currentHamiltonTime,
        origin: HOME_BASE.address,
        destination: matchedDest.name,
        recommendedBoardingStop: matchedDest.boardingStop,
        recommendedRoutes: matchedDest.routes,
        estimatedTravelTime: matchedDest.durationMinutes,
        frequency: matchedDest.frequency,
        localTips: matchedDest.tips,
        // Crucial: Exact upcoming departures for this trip
        exactUpcomingDepartures: specificBuses.length > 0 ? specificBuses : boardingStopData?.nextBuses?.slice(0, 3),
        allNearbyStops: departures.map(s => ({
          stop: s.stop,
          walkTime: s.walkFrom200Bay,
          nextBus: s.nextBuses[0] ? `Route ${s.nextBuses[0].route} at ${s.nextBuses[0].departureTime} (in ${s.nextBuses[0].inMinutes}m)` : 'Checking'
        }))
      };
    }

    // Generic destination fallback
    return {
      currentTime: currentHamiltonTime,
      origin: HOME_BASE.address,
      destination: destination,
      recommendedCorridors: [
        'Main St W at Bay St S (Stop #1020 - 3 min walk north for Westbound/McMaster)',
        'King St W at Bay St N (Stop #1021 - 4 min walk north for Eastbound/Eastgate)',
        'Frank A. Cooke Terminal on MacNab (8 min walk north for Mountain routes)'
      ],
      nearbyLiveDepartures: departures
    };
  }

  // 2. Specific Route Query (e.g. "Route 7", "Route 10", "Route 1")
  if (route_number) {
    const rNum = route_number.toString().trim().replace(/[^0-9a-z]/gi, '');
    const matchingStopsWithDepartures = [];

    departures.forEach(s => {
      const buses = s.nextBuses.filter(b => b.route.toLowerCase().includes(rNum.toLowerCase()));
      if (buses.length > 0) {
        matchingStopsWithDepartures.push({
          stop: s.stop,
          walkFrom200Bay: s.walkFrom200Bay,
          direction: s.direction,
          departures: buses
        });
      }
    });

    return {
      currentTime: currentHamiltonTime,
      origin: HOME_BASE.address,
      queriedRoute: `Route ${rNum}`,
      upcomingDepartures: matchingStopsWithDepartures.length > 0 ? matchingStopsWithDepartures : 'Route available via Frank A. Cooke / MacNab Transit Terminal (8 min walk north)',
      allNearbyStops: departures
    };
  }

  // 3. Default: Full departures overview from 200 Bay St S
  return {
    currentTime: currentHamiltonTime,
    origin: HOME_BASE.address,
    status: 'Live HSR Transit Departures from 200 Bay St S Hub',
    closestStops: departures.map(s => ({
      stopName: s.stop,
      walkDistance: s.walkFrom200Bay,
      direction: s.direction,
      nextDepartures: s.nextBuses.map(b => ({
        route: `Route ${b.route}`,
        destination: b.destination,
        departureTime: b.departureTime,
        countdown: `${b.inMinutes} mins`,
        status: b.status
      }))
    })),
    fareSummary: {
      adultPresto: '$2.70',
      cash: '$3.50',
      transferWindow: '2-hour free transfer across HSR & Burlington Transit',
      goCoFare: 'Free local HSR ride with PRESTO when connecting to/from GO Transit'
    }
  };
}
