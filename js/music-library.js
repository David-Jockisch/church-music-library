/*
  CHURCH MUSIC LIBRARY

  Put PDFs / Word documents in /documents
  Put MP3 practice recordings in /audio
*/

const musicLibrary = [
  {
    id: "build-my-life",
    title: "Build My Life",
    composer: "Brett Younker, Karl Martin, Kirby Kaple, Matt Redman & Pat Barrett",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Build My Life.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Build My Life.mp3"
      }
    ]
  },

  {
    id: "take-my-life-and-let-it-be",
    title: "Take My Life and Let it Be",
    composer: "Tomlin",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Take My Life and Let it Be.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Take My Life and Let it Be.mp3"
      }
    ]
  },

  {
    id: "yet-not-i-but-through-christ-in-me",
    title: "Yet Not I But Through Christ in Me",
    composer: "CityAlight — Jonny Robinson, Michael Farren & Rich Thompson",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Yet Not I But Through Christ in Me.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Yet Not I But Through Christ in Me.mp3"
      }
    ]
  },

  {
    id: "his-mercy-is-more",
    title: "His Mercy is More",
    composer: "Matt Papa, Matt Boswell",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/His Mercy is More.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/His Mercy is More.mp3"
      }
    ]
  },

  {
    id: "o-come-to-the-altar",
    title: "O Come to the Altar",
    composer: "Steven Furtick, Chris Brown, Wade Joye, Mack Brock",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/O Come to the Altar.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/O Come to the Altar.mp3"
      }
    ]
  },

  {
    id: "open-up-the-heavens",
    title: "Open up the Heavens",
    composer: "Andi Rozier, James McDonald, Jason Ingram, Meredith Andrews, Stuart Garrard",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Open Up the Heavens.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Open up the Heavens.mp3"
      }
    ]
  },

  {
    id: "overcome",
    title: "Overcome",
    composer: "Jeremy Camp",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Overcome.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Overcome.mp3"
      }
    ]
  },

  {
    id: "surrender",
    title: "Surrender",
    composer: "Vineyard",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Surrender.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Surrender.mp3"
      }
    ]
  },

  {
    id: "your-grace-is-enough",
    title: "Your Grace is Enough",
    composer: "Matt Maher, Chris Tomlin",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Your Grace is Enough.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Your Grace is Enough.mp3"
      }
    ]
  },

  {
    id: "abide-with-me",
    title: "Abide With Me",
    composer: "Henry Lyte",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Abide With Me.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Abide With Me.mp3"
      }
    ]
  },

  {
    id: "all-creatures-of-our-god-and-king",
    title: "All Creatures of Our God and King",
    composer: "",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/All Creatures of Our God and King.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/All Creatures of Our God and King.mp3"
      }
    ]
  },

  {
    id: "all-the-people-said-amen",
    title: "All the People Said Amen",
    composer: "Matt Maher",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/All the People Said Amen.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/All the People Said Amen.mp3"
      }
    ]
  },

  {
    id: "beautiful-one",
    title: "Beautiful One",
    composer: "Tim Hughes",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Beautiful One.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Beautiful One.mp3"
      }
    ]
  },

  {
    id: "blood-medley",
    title: "Blood Medley",
    composer: "",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Blood Medley.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Blood Medley.mp3"
      }
    ]
  },

  {
    id: "build-your-kingdom-here",
    title: "Build Your Kingdom Here",
    composer: "Rend Collective",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Build Your Kingdom Here.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Build Your Kingdom Here.mp3"
      }
    ]
  },

  {
    id: "come-behold-the-wondrous-mystery",
    title: "Come Behold the Wondrous Mystery",
    composer: "Matt Papa, Matt Boswell, Michael Bleecker",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Come Behold the Wondrous Mystery.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Come Behold the Wondrous Mystery.mp3"
      }
    ]
  },

  {
    id: "come-let-us-return-to-the-lord",
    title: "Come Let Us Return to the Lord",
    composer: "Matt Redman",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Come Let Us Return to the Lord.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Come Let Us Return to the Lord.mp3"
      }
    ]
  },

  {
    id: "come-thou-fount-d",
    title: "Come Thou Fount (D)",
    composer: "Robert Robertson",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Come Thou Fount (D).pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Come Thou Fount (D).mp3"
      }
    ]
  },

  {
    id: "evidence",
    title: "Evidence",
    composer: "Josh Baldwin",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Evidence.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Evidence.mp3"
      }
    ]
  },

  {
    id: "for-your-glory",
    title: "For Your Glory",
    composer: "Matt Maher",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/For Your Glory.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/For Your Glory.mp3"
      }
    ]
  },

  {
    id: "forever-reign",
    title: "Forever Reign",
    composer: "Reuben Morgan, Jason Ingram",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Forever Reign.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Forever Reign.mp3"
      }
    ]
  },

  {
    id: "holy-holy-holy",
    title: "Holy Holy Holy",
    composer: "Reginald Heber, John B. Dykes",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Holy Holy Holy.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Holy, Holy, Holy.mp3"
      }
    ]
  },

  {
    id: "holy-spirit",
    title: "Holy Spirit",
    composer: "Bryan & Katie Torwalt",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Holy Spirit.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Holy Spirit.mp3"
      }
    ]
  },

  {
    id: "how-great-is-our-god",
    title: "How Great is Our God",
    composer: "",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/How Great is Our God.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/How Great is Our God.mp3"
      }
    ]
  },

  {
    id: "it-is-well-with-my-soul",
    title: "It is Well With My Soul",
    composer: "Haratio Spafford",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/It is Well with My Soul.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/It is Well With My Soul.mp3"
      }
    ]
  },

  {
    id: "like-a-lamb-who-needs-a-shepherd",
    title: "Like a Lamb Who Needs a Shepherd",
    composer: "Ralph Carmichael",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Like a Lamb Who Needs a Shepherd.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Like a Lamb Who Needs a Shepherd.mp3"
      }
    ]
  },

  {
    id: "revelation-song",
    title: "Revelation Song",
    composer: "Phillips, Craig, Dean",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Revelation Song.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Revelation Song.mp3"
      }
    ]
  },

  {
    id: "speak-o-lord",
    title: "Speak, O Lord",
    composer: "Kieth Getty Stuart Townend",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Speak, O Lord.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Speak, O Lord.mp3"
      }
    ]
  },

  {
    id: "the-beauty-of-this-man",
    title: "The Beauty of this Man",
    composer: "Allen Hood, David Brymer",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/The Beauty of this Man.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/The Beauty of this Man.mp3"
      }
    ]
  },

  {
    id: "the-way",
    title: "The Way",
    composer: "Housefires",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/The Way.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/The Way.mp3"
      }
    ]
  },

  {
    id: "this-is-the-day",
    title: "This is the Day",
    composer: "",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/This is the Day.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/This is the Day.mp3"
      }
    ]
  },

  {
    id: "unbroken-praise",
    title: "Unbroken Praise",
    composer: "Matt Redman",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Unbroken Praise.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Unbroken Praise.mp3"
      }
    ]
  },

  {
    id: "worthy-is-the-lamb",
    title: "Worthy is the Lamb",
    composer: "",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Worthy is the Lamb.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Worthy is the Lamb.mp3"
      }
    ]
  },

  {
    id: "i-stand-amazed",
    title: "I Stand Amazed",
    composer: "Charles Gabriel",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/I Stand Amazed.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/I Stand Amazed.mp3"
      }
    ]
  },

  {
    id: "to-the-ends-of-the-earth",
    title: "To the Ends of the Earth",
    composer: "",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/To the Ends of the Earth.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/To the Ends of the Earth.mp3"
      }
    ]
  },

  {
    id: "because-he-lives",
    title: "Because He Lives",
    composer: "Gloria Gaither",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Because He Lives.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Because He Lives.mp3"
      }
    ]
  },

  {
    id: "blessed-assurance",
    title: "Blessed Assurance",
    composer: "Third Day",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Blessed Assurance.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Blessed assurance.m4a"
      }
      ]
    
  
  },

  {
    id: "heart-after-you",
    title: "Heart After You",
    composer: "Luke Wood",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Heart After You.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Heart After You.mp3"
      }
    ]
  },

  {
    id: "here-i-am-to-worship",
    title: "Here I am to Worship",
    composer: "",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Here I am to Worship.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Here I am to Worship.mp3"
      }
    ]
  },

  {
    id: "i-know-who-holds-tomorrow",
    title: "I Know Who Holds Tomorrow",
    composer: "Ira F Stanphill",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/I Know Who Holds Tomorrow.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/I Know Who Holds Tomorrow.mp3"
      }
    ]
  },

  {
    id: "lord-i-need-you",
    title: "Lord I Need You",
    composer: "Matt Maher",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Lord I Need You.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Lord I need you.m4a"
      }
    ]
  },

  {
    id: "majestic",
    title: "Majestic",
    composer: "Lincoln Brewster",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Majestic.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Majestic.m4a"
      }
    ]
  },

  {
    id: "no-longer-i",
    title: "No Longer I",
    composer: "Matt Redman",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/No Longer I.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/No Longer I.mp3"
      }
    ]
  },

  {
    id: "stand-in-your-love-bb",
    title: "Stand in Your Love (Bb)",
    composer: "Josh Baldwin",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Stand in Your Love (Bb).pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Stand in Your Love (Bb).mp3"
      }
    ]
  },

  {
    id: "victory-in-jesus",
    title: "Victory in Jesus",
    composer: "",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Victory in Jesus.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Victory in Jesus.mp3"
      }
    ]
  },

  {
    id: "you-never-let-go",
    title: "You Never Let Go",
    composer: "Matt Redman",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/You Never Let Go.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/You Never Let Go (B).mp3"
      }
    ]
  },


  {
    id: "better-is-one-day",
    title: "Better is One Day",
    composer: "",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Better is One Day.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Better is One Day.mp3"
      }
    ]
  },

  {
    id: "trading-my-sorrows",
    title: "Trading My Sorrows",
    composer: "",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Trading My Sorrows.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Trading My Sorrows.mp3"
      }
    ]
  },

  {
    id: "doxology-god-be-praised",
    title: "Doxology (God Be Praised)",
    composer: "",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Doxology (God Be Praised) (G).pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Doxology (God Be Praised).mp3"
      }
    ]
  },

  {
    id: "good-good-father",
    title: "Good Good Father",
    composer: "",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Good Good Father.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Good Good Father.mp3"
      }
    ]
  },

  {
    id: "this-is-amazing-grace-g",
    title: "This is Amazing Grace (G)",
    composer: "",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/This is Amazing Grace (G).pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/This is Amazing Grace (G).mp3"
      }
    ]
  },

  {
    id: "let-it-be-said-of-us",
    title: "Let It Be Said of Us",
    composer: "",
    tags: ["worship"],
    documents: [
      {
        label: "Sheet Music",
        type: "pdf",
        file: "documents/Let It Be Said of Us.pdf"
      }
    ],
    audio: [
      {
        label: "Practice Track",
        file: "audio/Let It Be Said of Us.mp3"
      }
    ]
  }
];
