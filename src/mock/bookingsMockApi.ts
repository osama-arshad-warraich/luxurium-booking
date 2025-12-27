// src/mock/bookingsMockApi.ts

export type Slot = "LUNCH" | "DINNER";

export type BookingStatus =
  | "INQUIRY"
  | "TENTATIVE"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export interface HallAllocation {
  hallCode: "A" | "B";
  hallName: string;
  capacity: number;
  guestsHere: number;
  guestsInOtherHallsText?: string;
}

export interface AdvanceSummary {
  amount: number;
  method: string;
  destinationAccount: string;
  reference?: string;
  receivedAtLabel?: string;
}

export interface MockBooking {
  id: number;
  bookingRef: string;

  // Short event type (Barat, Walima, Mehndi, Nikkah, Corporate Event, etc.)
  eventTitle: string;

  // Full wording / what appears on nameplate & detailed views
  nameplateText?: string;

  eventDateLabel: string; // e.g. "27 Nov 2025"
  slot: Slot;

  totalGuests: number;
  hallAGuests: number | null;
  hallBGuests: number | null;

  status: BookingStatus;

  customerName: string;
  customerPhone: string;
  customerWhatsapp?: string;
  familyOrCompanyName?: string;
  customerAddress?: string;
  customerReference?: string;

  hasPerformance: boolean;
  performanceDescription?: string;

  halls: HallAllocation[];

  internalNote?: string;
  advance?: AdvanceSummary;

  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedReason?: string;
}

// November 2025 mock data – many different days, including:
// - Light days with 1–2 events
// - Very busy days
// - One extreme day (15 Nov) with 12 functions (3 per hall per slot)
// - Some full-capacity or over-capacity examples
// - Inquiries and tentative bookings that should not fully book the slot
export const MOCK_BOOKINGS: MockBooking[] = [
  // --- 1 Nov 2025 ---
  {
    id: 1,
    bookingRef: "LUX-2025-11-0001",
    eventTitle: "Mehndi",
    nameplateText: "Mehndi – Hamza & Noor",
    eventDateLabel: "01 Nov 2025",
    slot: "DINNER",
    totalGuests: 450,
    hallAGuests: 450,
    hallBGuests: null,
    status: "CONFIRMED",
    customerName: "Hamza Khan",
    customerPhone: "0300-1110001",
    familyOrCompanyName: "Khan Family",
    customerAddress: "DHA Phase 5, Karachi",
    hasPerformance: true,
    performanceDescription: "Dhol + small musical performance",
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 450,
      },
    ],
    internalNote: "Color theme: yellow/green. Stage in center.",
  },

  // --- 2 Nov 2025 ---
  {
    id: 2,
    bookingRef: "LUX-2025-11-0002",
    eventTitle: "Corporate Lunch",
    nameplateText: "Corporate Lunch – Alpha Tech",
    eventDateLabel: "02 Nov 2025",
    slot: "LUNCH",
    totalGuests: 300,
    hallAGuests: 300,
    hallBGuests: null,
    status: "CONFIRMED",
    customerName: "Alpha Tech HR",
    customerPhone: "021-111-000-222",
    familyOrCompanyName: "Alpha Tech Pvt Ltd",
    customerAddress: "Clifton, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 300,
      },
    ],
    internalNote: "Projector required. Corporate branding on stage.",
  },

  // --- 3 Nov 2025 ---
  {
    id: 3,
    bookingRef: "LUX-2025-11-0003",
    eventTitle: "Birthday",
    nameplateText: "Birthday – Zain 1st",
    eventDateLabel: "03 Nov 2025",
    slot: "LUNCH",
    totalGuests: 200,
    hallAGuests: null,
    hallBGuests: 200,
    status: "TENTATIVE",
    customerName: "Faisal Family",
    customerPhone: "0301-2345678",
    customerAddress: "Gulshan-e-Iqbal, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 200,
      },
    ],
    internalNote: "They may upgrade decor. Kid-friendly menu.",
  },

  // --- 4 Nov 2025 ---
  {
    id: 4,
    bookingRef: "LUX-2025-11-0004",
    eventTitle: "Nikkah",
    nameplateText: "Nikkah – Bilal & Maryam",
    eventDateLabel: "04 Nov 2025",
    slot: "DINNER",
    totalGuests: 600,
    hallAGuests: 300,
    hallBGuests: 300,
    status: "CONFIRMED",
    customerName: "Bilal Family",
    customerPhone: "0302-2223344",
    customerAddress: "PECHS, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 300,
        guestsInOtherHallsText: "300 in Hall B",
      },
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 300,
        guestsInOtherHallsText: "300 in Hall A",
      },
    ],
    internalNote: "Religious recitation. Low volume background music only.",
  },

  // --- 5 Nov 2025 ---
  {
    id: 5,
    bookingRef: "LUX-2025-11-0005",
    eventTitle: "Walima",
    nameplateText: "Walima – Danish & Ayesha",
    eventDateLabel: "05 Nov 2025",
    slot: "DINNER",
    totalGuests: 1000,
    hallAGuests: 1000,
    hallBGuests: null,
    status: "CONFIRMED",
    customerName: "Danish Family",
    customerPhone: "0303-5554443",
    customerAddress: "North Nazimabad, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 1000,
      },
    ],
    internalNote: "Full hall. Very tight timing on entry.",
  },

  // --- 6 Nov 2025 ---
  {
    id: 6,
    bookingRef: "LUX-2025-11-0006",
    eventTitle: "Corporate Event",
    nameplateText: "Corporate Dinner – Beta Finance",
    eventDateLabel: "06 Nov 2025",
    slot: "DINNER",
    totalGuests: 700,
    hallAGuests: 350,
    hallBGuests: 350,
    status: "TENTATIVE",
    customerName: "Beta Finance Ltd",
    customerPhone: "021-333-444-555",
    customerAddress: "Shahrah-e-Faisal, Karachi",
    hasPerformance: true,
    performanceDescription: "Live band (loud) in Hall A",
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 350,
        guestsInOtherHallsText: "350 in Hall B",
      },
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 350,
        guestsInOtherHallsText: "350 in Hall A",
      },
    ],
    internalNote: "Performance may block other events.",
  },

  // --- 7 Nov 2025 ---
  {
    id: 7,
    bookingRef: "LUX-2025-11-0007",
    eventTitle: "Seminar",
    nameplateText: "Seminar – Health Conference",
    eventDateLabel: "07 Nov 2025",
    slot: "LUNCH",
    totalGuests: 500,
    hallAGuests: null,
    hallBGuests: 500,
    status: "CONFIRMED",
    customerName: "MedPro Org",
    customerPhone: "021-123-456-789",
    customerAddress: "Clifton, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 500,
      },
    ],
  },

  // --- 8 Nov 2025 ---
  {
    id: 8,
    bookingRef: "LUX-2025-11-0008",
    eventTitle: "Barat",
    nameplateText: "Baraat – Hassan & Sadaf",
    eventDateLabel: "08 Nov 2025",
    slot: "DINNER",
    totalGuests: 900,
    hallAGuests: 600,
    hallBGuests: 300,
    status: "CONFIRMED",
    customerName: "Hassan Family",
    customerPhone: "0304-1234567",
    customerAddress: "Gulistan-e-Jauhar, Karachi",
    hasPerformance: true,
    performanceDescription: "Dhol + DJ (medium volume)",
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 600,
        guestsInOtherHallsText: "300 in Hall B",
      },
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 300,
        guestsInOtherHallsText: "600 in Hall A",
      },
    ],
  },

  // --- 9 Nov 2025 ---
  {
    id: 9,
    bookingRef: "LUX-2025-11-0009",
    eventTitle: "Corporate Training",
    nameplateText: "Corporate Training – Gamma Solutions",
    eventDateLabel: "09 Nov 2025",
    slot: "LUNCH",
    totalGuests: 250,
    hallAGuests: 250,
    hallBGuests: null,
    status: "INQUIRY",
    customerName: "Gamma Solutions",
    customerPhone: "021-444-555-666",
    customerAddress: "I.I. Chundrigar Road, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 250,
      },
    ],
  },

  // --- 10 Nov 2025 ---
  {
    id: 10,
    bookingRef: "LUX-2025-11-0010",
    eventTitle: "Reception",
    nameplateText: "Reception – Imran & Hira",
    eventDateLabel: "10 Nov 2025",
    slot: "DINNER",
    totalGuests: 800,
    hallAGuests: 800,
    hallBGuests: null,
    status: "CONFIRMED",
    customerName: "Imran Family",
    customerPhone: "0305-6781234",
    customerAddress: "DHA Phase 6, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 800,
      },
    ],
  },

  // --- 11 Nov 2025 ---
  {
    id: 11,
    bookingRef: "LUX-2025-11-0011",
    eventTitle: "Walima",
    nameplateText: "Walima – Zubair & Mahnoor",
    eventDateLabel: "11 Nov 2025",
    slot: "DINNER",
    totalGuests: 1000,
    hallAGuests: 500,
    hallBGuests: 500,
    status: "CONFIRMED",
    customerName: "Zubair Family",
    customerPhone: "0307-1112233",
    customerAddress: "Bahadurabad, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 500,
        guestsInOtherHallsText: "500 in Hall B",
      },
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 500,
        guestsInOtherHallsText: "500 in Hall A",
      },
    ],
  },

  // --- 12 Nov 2025 ---
  {
    id: 12,
    bookingRef: "LUX-2025-11-0012",
    eventTitle: "Corporate Event",
    nameplateText: "Corporate Gala – Delta Corp",
    eventDateLabel: "12 Nov 2025",
    slot: "DINNER",
    totalGuests: 1200,
    hallAGuests: 800,
    hallBGuests: 400,
    status: "CONFIRMED",
    customerName: "Delta Corp",
    customerPhone: "021-777-888-999",
    customerAddress: "Clifton, Karachi",
    hasPerformance: true,
    performanceDescription: "Full band + host",
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 800,
        guestsInOtherHallsText: "400 in Hall B",
      },
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 400,
        guestsInOtherHallsText: "800 in Hall A",
      },
    ],
    internalNote: "Near-full usage; carefully manage entry/exit.",
  },

  // --- 13 Nov 2025 ---
  {
    id: 13,
    bookingRef: "LUX-2025-11-0013",
    eventTitle: "Nikkah",
    nameplateText: "Nikkah – Umar & Fiza",
    eventDateLabel: "13 Nov 2025",
    slot: "LUNCH",
    totalGuests: 350,
    hallAGuests: null,
    hallBGuests: 350,
    status: "CONFIRMED",
    customerName: "Umar Family",
    customerPhone: "0308-1113335",
    customerAddress: "Garden East, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 350,
      },
    ],
  },

  // --- 14 Nov 2025 ---
  {
    id: 14,
    bookingRef: "LUX-2025-11-0014",
    eventTitle: "Conference",
    nameplateText: "Conference – Tech Summit",
    eventDateLabel: "14 Nov 2025",
    slot: "LUNCH",
    totalGuests: 700,
    hallAGuests: 700,
    hallBGuests: null,
    status: "CONFIRMED",
    customerName: "Tech Summit Org",
    customerPhone: "021-909-808-707",
    customerAddress: "Karachi Expo Area",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 700,
      },
    ],
  },

  // --- 15 Nov 2025 – EXTREME DAY: 12 FUNCTIONS (3 per hall per slot) ---
  // Lunch – Hall A (3 events, 1000 total)
  {
    id: 15,
    bookingRef: "LUX-2025-11-0015",
    eventTitle: "Walima",
    nameplateText: "Small Walima 1 – A",
    eventDateLabel: "15 Nov 2025",
    slot: "LUNCH",
    totalGuests: 300,
    hallAGuests: 300,
    hallBGuests: null,
    status: "CONFIRMED",
    customerName: "Client A1",
    customerPhone: "0300-0000001",
    customerAddress: "DHA, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 300,
        guestsInOtherHallsText: "700 more in Hall A (other events)",
      },
    ],
  },
  {
    id: 16,
    bookingRef: "LUX-2025-11-0016",
    eventTitle: "Walima",
    nameplateText: "Small Walima 2 – A",
    eventDateLabel: "15 Nov 2025",
    slot: "LUNCH",
    totalGuests: 350,
    hallAGuests: 350,
    hallBGuests: null,
    status: "CONFIRMED",
    customerName: "Client A2",
    customerPhone: "0300-0000002",
    customerAddress: "Clifton, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 350,
        guestsInOtherHallsText: "650 more in Hall A (other events)",
      },
    ],
  },
  {
    id: 17,
    bookingRef: "LUX-2025-11-0017",
    eventTitle: "Walima",
    nameplateText: "Small Walima 3 – A",
    eventDateLabel: "15 Nov 2025",
    slot: "LUNCH",
    totalGuests: 350,
    hallAGuests: 350,
    hallBGuests: null,
    status: "CONFIRMED",
    customerName: "Client A3",
    customerPhone: "0300-0000003",
    customerAddress: "Bahadurabad, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 350,
        guestsInOtherHallsText: "650 more in Hall A (other events)",
      },
    ],
  },

  // Lunch – Hall B (3 events, 1000 total)
  {
    id: 18,
    bookingRef: "LUX-2025-11-0018",
    eventTitle: "Event",
    nameplateText: "Small Event 1 – B",
    eventDateLabel: "15 Nov 2025",
    slot: "LUNCH",
    totalGuests: 400,
    hallAGuests: null,
    hallBGuests: 400,
    status: "CONFIRMED",
    customerName: "Client B1",
    customerPhone: "0300-0000004",
    customerAddress: "Gulshan, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 400,
        guestsInOtherHallsText: "600 more in Hall B (other events)",
      },
    ],
  },
  {
    id: 19,
    bookingRef: "LUX-2025-11-0019",
    eventTitle: "Event",
    nameplateText: "Small Event 2 – B",
    eventDateLabel: "15 Nov 2025",
    slot: "LUNCH",
    totalGuests: 300,
    hallAGuests: null,
    hallBGuests: 300,
    status: "CONFIRMED",
    customerName: "Client B2",
    customerPhone: "0300-0000005",
    customerAddress: "PECHS, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 300,
        guestsInOtherHallsText: "700 more in Hall B (other events)",
      },
    ],
  },
  {
    id: 20,
    bookingRef: "LUX-2025-11-0020",
    eventTitle: "Event",
    nameplateText: "Small Event 3 – B",
    eventDateLabel: "15 Nov 2025",
    slot: "LUNCH",
    totalGuests: 300,
    hallAGuests: null,
    hallBGuests: 300,
    status: "CONFIRMED",
    customerName: "Client B3",
    customerPhone: "0300-0000006",
    customerAddress: "Nazimabad, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 300,
        guestsInOtherHallsText: "700 more in Hall B (other events)",
      },
    ],
  },

  // Dinner – Hall A (3 events, 1100 total => over capacity edge case)
  {
    id: 21,
    bookingRef: "LUX-2025-11-0021",
    eventTitle: "Event",
    nameplateText: "Dinner Event 1 – A",
    eventDateLabel: "15 Nov 2025",
    slot: "DINNER",
    totalGuests: 400,
    hallAGuests: 400,
    hallBGuests: null,
    status: "CONFIRMED",
    customerName: "Client A4",
    customerPhone: "0300-0000007",
    customerAddress: "DHA, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 400,
        guestsInOtherHallsText: "700 more in Hall A (other events)",
      },
    ],
  },
  {
    id: 22,
    bookingRef: "LUX-2025-11-0022",
    eventTitle: "Event",
    nameplateText: "Dinner Event 2 – A",
    eventDateLabel: "15 Nov 2025",
    slot: "DINNER",
    totalGuests: 350,
    hallAGuests: 350,
    hallBGuests: null,
    status: "CONFIRMED",
    customerName: "Client A5",
    customerPhone: "0300-0000008",
    customerAddress: "Clifton, Karachi",
    hasPerformance: true,
    performanceDescription: "DJ in Hall A",
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 350,
        guestsInOtherHallsText: "750 more in Hall A (other events)",
      },
    ],
  },
  {
    id: 23,
    bookingRef: "LUX-2025-11-0023",
    eventTitle: "Event",
    nameplateText: "Dinner Event 3 – A",
    eventDateLabel: "15 Nov 2025",
    slot: "DINNER",
    totalGuests: 350,
    hallAGuests: 350,
    hallBGuests: null,
    status: "CONFIRMED",
    customerName: "Client A6",
    customerPhone: "0300-0000009",
    customerAddress: "Gulshan, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 350,
        guestsInOtherHallsText: "750 more in Hall A (other events)",
      },
    ],
  },

  // Dinner – Hall B (3 events, 900 total)
  {
    id: 24,
    bookingRef: "LUX-2025-11-0024",
    eventTitle: "Event",
    nameplateText: "Dinner Event 1 – B",
    eventDateLabel: "15 Nov 2025",
    slot: "DINNER",
    totalGuests: 300,
    hallAGuests: null,
    hallBGuests: 300,
    status: "CONFIRMED",
    customerName: "Client B4",
    customerPhone: "0300-0000010",
    customerAddress: "North Nazimabad, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 300,
        guestsInOtherHallsText: "600 more in Hall B (other events)",
      },
    ],
  },
  {
    id: 25,
    bookingRef: "LUX-2025-11-0025",
    eventTitle: "Event",
    nameplateText: "Dinner Event 2 – B",
    eventDateLabel: "15 Nov 2025",
    slot: "DINNER",
    totalGuests: 300,
    hallAGuests: null,
    hallBGuests: 300,
    status: "CONFIRMED",
    customerName: "Client B5",
    customerPhone: "0300-0000011",
    customerAddress: "PECHS, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 300,
        guestsInOtherHallsText: "600 more in Hall B (other events)",
      },
    ],
  },
  {
    id: 26,
    bookingRef: "LUX-2025-11-0026",
    eventTitle: "Event",
    nameplateText: "Dinner Event 3 – B",
    eventDateLabel: "15 Nov 2025",
    slot: "DINNER",
    totalGuests: 300,
    hallAGuests: null,
    hallBGuests: 300,
    status: "CONFIRMED",
    customerName: "Client B6",
    customerPhone: "0300-0000012",
    customerAddress: "Gulshan, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 300,
        guestsInOtherHallsText: "600 more in Hall B (other events)",
      },
    ],
  },

  // --- 18 Nov 2025 ---
  {
    id: 27,
    bookingRef: "LUX-2025-11-0027",
    eventTitle: "Corporate Lunch",
    nameplateText: "Corporate Lunch – Omega Ltd",
    eventDateLabel: "18 Nov 2025",
    slot: "LUNCH",
    totalGuests: 450,
    hallAGuests: 450,
    hallBGuests: null,
    status: "CONFIRMED",
    customerName: "Omega Ltd",
    customerPhone: "021-555-000-111",
    customerAddress: "Clifton, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 450,
      },
    ],
  },

  // --- 20 Nov 2025 ---
  {
    id: 28,
    bookingRef: "LUX-2025-11-0028",
    eventTitle: "Walima",
    nameplateText: "Walima – Jawad & Laiba",
    eventDateLabel: "20 Nov 2025",
    slot: "DINNER",
    totalGuests: 950,
    hallAGuests: 950,
    hallBGuests: null,
    status: "CONFIRMED",
    customerName: "Jawad Family",
    customerPhone: "0306-1239876",
    customerAddress: "DHA Phase 7, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 950,
      },
    ],
  },

  // --- 22 Nov 2025 ---
  {
    id: 29,
    bookingRef: "LUX-2025-11-0029",
    eventTitle: "Corporate Event",
    nameplateText: "Corporate Awards Night – Sigma Group",
    eventDateLabel: "22 Nov 2025",
    slot: "DINNER",
    totalGuests: 1300,
    hallAGuests: 800,
    hallBGuests: 500,
    status: "CONFIRMED",
    customerName: "Sigma Group",
    customerPhone: "021-777-000-999",
    customerAddress: "Karachi Business District",
    hasPerformance: true,
    performanceDescription: "Full band + award ceremony",
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 800,
        guestsInOtherHallsText: "500 in Hall B",
      },
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 500,
        guestsInOtherHallsText: "800 in Hall A",
      },
    ],
  },

  // --- 23 Nov 2025 ---
  {
    id: 30,
    bookingRef: "LUX-2025-11-0030",
    eventTitle: "Family Event",
    nameplateText: "Family Gathering – Khan Reunion",
    eventDateLabel: "23 Nov 2025",
    slot: "LUNCH",
    totalGuests: 350,
    hallAGuests: null,
    hallBGuests: 350,
    status: "CONFIRMED",
    customerName: "Khan Family",
    customerPhone: "0309-5557779",
    customerAddress: "Gulshan, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 350,
      },
    ],
  },

  // --- 25 Nov 2025 ---
  {
    id: 31,
    bookingRef: "LUX-2025-11-0031",
    eventTitle: "Reception",
    nameplateText: "Reception – Usman & Ayesha",
    eventDateLabel: "25 Nov 2025",
    slot: "DINNER",
    totalGuests: 900,
    hallAGuests: 500,
    hallBGuests: 400,
    status: "COMPLETED",
    customerName: "Usman Family",
    customerPhone: "0305-5551234",
    customerAddress: "PECHS, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 500,
        guestsInOtherHallsText: "400 in Hall B",
      },
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 400,
        guestsInOtherHallsText: "500 in Hall A",
      },
    ],
    internalNote:
      "Event completed smoothly. Client happy, possible future corporate booking.",
    advance: {
      amount: 100000,
      method: "BANK TRANSFER",
      destinationAccount: "UBL – Luxurium Ops",
      receivedAtLabel: "05 Nov 2025",
    },
  },

  // --- 27 Nov 2025 ---
  {
    id: 32,
    bookingRef: "LUX-2025-11-0032",
    eventTitle: "Walima",
    nameplateText: "Walima – Ali & Sara",
    eventDateLabel: "27 Nov 2025",
    slot: "LUNCH",
    totalGuests: 1000,
    hallAGuests: 700,
    hallBGuests: 300,
    status: "CONFIRMED",
    customerName: "Ali Khan",
    customerPhone: "0300-1234567",
    customerWhatsapp: "0300-1234567",
    familyOrCompanyName: "Khan Family",
    customerAddress: "DHA Phase 6, Karachi",
    customerReference: "Referred by Mr. Naveed (Owner’s friend)",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 700,
        guestsInOtherHallsText: "300 in Hall B",
      },
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 300,
        guestsInOtherHallsText: "700 in Hall A",
      },
    ],
    internalNote:
      "VIP client. Stage on left, brighter lighting. Entry from side gate.",
    advance: {
      amount: 200000,
      method: "BANK TRANSFER",
      destinationAccount: "HBL – Luxurium Ops",
      reference: "TRX-123456",
      receivedAtLabel: "15 Nov 2025",
    },
  },
  {
    id: 33,
    bookingRef: "LUX-2025-11-0033",
    eventTitle: "Corporate Event",
    nameplateText: "Corporate Dinner – Annual Meetup",
    eventDateLabel: "27 Nov 2025",
    slot: "DINNER",
    totalGuests: 400,
    hallAGuests: 400,
    hallBGuests: null,
    status: "TENTATIVE",
    customerName: "XYZ Corp",
    customerPhone: "021-111-222-333",
    familyOrCompanyName: "XYZ Corporation",
    customerAddress: "Shahrah-e-Faisal, Karachi",
    customerReference: "Corporate deal via Ali Marketing",
    hasPerformance: true,
    performanceDescription: "Corporate band & DJ (likely in Hall A only)",
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 400,
      },
    ],
    internalNote:
      "Corporate branding on stage backdrop. Payment via bank transfer.",
  },

  // --- 28 Nov 2025 ---
  {
    id: 34,
    bookingRef: "LUX-2025-11-0034",
    eventTitle: "Barat",
    nameplateText: "Baraat – Ahmed & Sana",
    eventDateLabel: "28 Nov 2025",
    slot: "DINNER",
    totalGuests: 1000,
    hallAGuests: 1000,
    hallBGuests: null,
    status: "CONFIRMED",
    customerName: "Ahmed Raza",
    customerPhone: "0301-9876543",
    familyOrCompanyName: "Raza Family",
    customerAddress: "Gulshan-e-Iqbal, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 1000,
      },
    ],
    internalNote: "Full hall booking. Extra focus on stage decoration.",
    advance: {
      amount: 150000,
      method: "CASH",
      destinationAccount: "Cash counter",
      receivedAtLabel: "10 Nov 2025",
    },
  },

  // --- 29 Nov 2025 ---
  {
    id: 35,
    bookingRef: "LUX-2025-11-0035",
    eventTitle: "Corporate Seminar",
    nameplateText: "Corporate Seminar",
    eventDateLabel: "29 Nov 2025",
    slot: "LUNCH",
    totalGuests: 600,
    hallAGuests: null,
    hallBGuests: 600,
    status: "INQUIRY",
    customerName: "ABC Ltd",
    customerPhone: "021-222-333-444",
    familyOrCompanyName: "ABC Limited",
    customerAddress: "Clifton, Karachi",
    hasPerformance: false,
    halls: [
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 600,
      },
    ],
    internalNote:
      "They are still confirming exact headcount. May upgrade to full hall.",
  },

  // --- Extra INQUIRY / TENTATIVE examples ---

  // 16 Nov 2025 – Inquiry at lunch
  {
    id: 36,
    bookingRef: "LUX-2025-11-0036",
    eventTitle: "Wedding",
    nameplateText: "Prospect – Wedding Inquiry",
    eventDateLabel: "16 Nov 2025",
    slot: "LUNCH",
    totalGuests: 350,
    hallAGuests: 350,
    hallBGuests: null,
    status: "INQUIRY",
    customerName: "Mr. Prospective",
    customerPhone: "0300-2223344",
    customerAddress: "Clifton, Karachi",
    customerReference: "Walk-in",
    hasPerformance: false,
    halls: [
      {
        hallCode: "A",
        hallName: "Hall A",
        capacity: 1000,
        guestsHere: 350,
      },
    ],
    internalNote:
      "Still deciding on date; just checking availability and rough pricing.",
  },

  // 16 Nov 2025 – Tentative at dinner
  {
    id: 37,
    bookingRef: "LUX-2025-11-0037",
    eventTitle: "Meeting",
    nameplateText: "Tentative – Corporate Strategy Meet",
    eventDateLabel: "16 Nov 2025",
    slot: "DINNER",
    totalGuests: 500,
    hallAGuests: null,
    hallBGuests: 500,
    status: "TENTATIVE",
    customerName: "Future Corp Ltd",
    customerPhone: "021-999-888-777",
    customerAddress: "Shahrah-e-Faisal, Karachi",
    customerReference: "Referred by Beta Finance",
    hasPerformance: false,
    halls: [
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 500,
      },
    ],
    internalNote:
      "Awaiting management approval. Slot should stay visible but not considered fully booked.",
  },

  // 19 Nov 2025 – Another inquiry
  {
    id: 38,
    bookingRef: "LUX-2025-11-0038",
    eventTitle: "Birthday",
    nameplateText: "Inquiry – Small Birthday",
    eventDateLabel: "19 Nov 2025",
    slot: "LUNCH",
    totalGuests: 150,
    hallAGuests: null,
    hallBGuests: 150,
    status: "INQUIRY",
    customerName: "Mrs. Saima",
    customerPhone: "0301-0001122",
    customerAddress: "Gulshan-e-Iqbal, Karachi",
    customerReference: "Friend of staff",
    hasPerformance: false,
    halls: [
      {
        hallCode: "B",
        hallName: "Hall B",
        capacity: 1000,
        guestsHere: 150,
      },
    ],
    internalNote:
      "She is collecting quotes from multiple venues; follow up in 2 days.",
  },
];

// --------------------------------------------------
// Public API
// --------------------------------------------------

export function getAllBookings(): MockBooking[] {
  return MOCK_BOOKINGS;
}

export function getBookingById(id: number | null): MockBooking | undefined {
  if (id == null) return undefined;
  return MOCK_BOOKINGS.find((b) => b.id === id);
}

// --------------------------------------------------
// Dashboard helpers (optional but useful):
// Today + Upcoming bookings
// --------------------------------------------------

function parseLabelToDate(label: string): Date {
  // "27 Nov 2025" is safely parsed by JS Date in modern engines
  return new Date(label);
}

function dateKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type TodayBooking = MockBooking;
export type UpcomingBooking = MockBooking;

export function getTodayBookings(today: Date = new Date()): TodayBooking[] {
  const todayKey = dateKeyFromDate(today);
  return MOCK_BOOKINGS.filter(
    (b) => dateKeyFromDate(parseLabelToDate(b.eventDateLabel)) === todayKey
  );
}

export function getUpcomingBookings(
  from: Date = new Date(),
  daysAhead: number = 14
): UpcomingBooking[] {
  const fromTime = from.getTime();
  const toTime = fromTime + daysAhead * 24 * 60 * 60 * 1000;

  return MOCK_BOOKINGS.filter((b) => {
    const t = parseLabelToDate(b.eventDateLabel).getTime();
    return t > fromTime && t <= toTime;
  }).sort(
    (a, b) =>
      parseLabelToDate(a.eventDateLabel).getTime() -
      parseLabelToDate(b.eventDateLabel).getTime()
  );
}
