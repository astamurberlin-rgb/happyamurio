/* Студия градиентов · пресеты заливки по темам.
   По 3 пресета на каждую тему; у трёх ночных тем есть четвёртый — «Рассвет», по референсу. Формат — PRESETS.md рядом.
   Ключ темы — id из shared/happy-reference-themes.js (например 'happy-ref-mint-v1'), для исходного вида приложений — 'original'.
   Пустой список или отсутствие темы — в студии пустые места «Ждёт пресет».
   Каждый пресет — полный набор: дуги энергии, полоски строк, дуги Day. Чего в пресете нет — берётся из исходного вида приложения. */
window.HappyGradientPresets={
  version:1,
  themes:{
  /* ── Оригинал: Day голубой, Meal бордо, Sport фиолетовый ── */
  'original':[
    {
      name:'Пастель',
      note:'Мягче: те же бирюза, фиолетовый и розовый, но светлее и спокойнее.',
      energy:{
        eat:  {c0:'#A8F5F4',cm:'#AD9FFA',c1:'#FABEEC',mw:30,s0:59,s1:77,a0:66,a1:86},
        spent:{c0:'#FABEEC',cm:'#AD9FFA',c1:'#A8F5F4',mw:30,s0:17,s1:45,a0:72,a1:94},
        track:20
      },
      apps:{meal:{energy:{
        eat:  {c0:'#A8F5F4',cm:'#77A4F6',c1:'#F2A5EF',mw:30,s0:59,s1:85,a0:66,a1:86},
        spent:{c0:'#F2A5EF',cm:'#77A4F6',c1:'#A8F5F4',mw:30,s0:17,s1:45,a0:72,a1:94},
        track:20
      }}},
      bars:{hues:{pink:350,violet:305,blue:262,teal:180},chroma:.085,from:.92,to:.82,over:.68,dot:.88,track:22},
      day:{
        flow:{mode:'flow',colors:['#9BE0DB','#97C2F0','#B6F1F4'],intensity:55,softness:80,duration:18},
        balance:{posColor:'#A7FAF6',negColor:'#FDC2CE',blend:55,fade:35,alpha:100},
        progress:['#FABEEC','#BD9FF2','#A0F3F2','#B0EED7']
      }
    },
    {
      name:'Солнце',
      note:'Контраст: тёплый свет — лимон, абрикос и коралл на холодном фоне.',
      energy:{
        eat:  {c0:'#FCF0B2',cm:'#FBC688',c1:'#FAA2A2',mw:30,s0:59,s1:77,a0:80,a1:96},
        spent:{c0:'#FAA2A2',cm:'#FBC688',c1:'#FCF0B2',mw:30,s0:17,s1:45,a0:84,a1:98},
        track:20
      },
      bars:{hues:{pink:15,violet:45,blue:75,teal:100},chroma:.11,from:.91,to:.79,over:.63,dot:.85,track:22},
      day:{
        flow:{mode:'flow',colors:['#FBF5DF','#FFFFFF','#FEEADB'],intensity:48,softness:82,duration:18},
        balance:{posColor:'#FDEC9E',negColor:'#FD9B9E',blend:55,fade:35,alpha:100},
        progress:['#FAA2A2','#FEC48B','#FEEBA6','#FAF8D1']
      }
    },
    {
      name:'Жемчуг',
      note:'Мягкий: почти белая заливка с лёгким сиреневым и розовым отливом.',
      energy:{
        eat:  {c0:'#FFFFFF',cm:'#EEECFE',c1:'#FDDEEE',mw:30,s0:59,s1:77,a0:68,a1:90},
        spent:{c0:'#FDDEEE',cm:'#EEECFE',c1:'#FFFFFF',mw:30,s0:17,s1:45,a0:74,a1:94},
        track:20
      },
      bars:{hues:{pink:350,violet:305,blue:262,teal:180},chroma:.045,from:.975,to:.9,over:.78,dot:.94,track:16},
      day:{
        flow:{mode:'shimmer',colors:['#DAF0F7','#FFFFFF','#EBE3FD'],intensity:42,softness:85,duration:20},
        balance:{posColor:'#FFFFFF',negColor:'#FCC5DE',blend:55,fade:35,alpha:96},
        progress:['#FED8EC','#EEE7FE','#FFFFFF','#DCF9F6']
      }
    }
  ],

  /* 23.11.2026: «Мята» теперь бирюза с песком (бывший «Бирюзовый полдень»), пресеты подобраны заново */
  /* ── Мята ── */
  'happy-ref-mint-v1':[
    {
      name:'Отмель',
      note:'В тон: пена, салатовый и лайм — солнечная вода над песком.',
      energy:{
        eat:  {c0:'#C8FFD2',cm:'#D7FEA6',c1:'#F8F676',mw:30,s0:59,s1:77,a0:76,a1:95},
        spent:{c0:'#F8F676',cm:'#D7FEA6',c1:'#C8FFD2',mw:30,s0:17,s1:45,a0:80,a1:97},
        track:20
      },
      bars:{hues:{pink:100,violet:120,blue:140,teal:160},chroma:.13,from:.96,to:.87,over:.72,dot:.92,track:20},
      day:{
        flow:{mode:'flow',colors:['#C0F5C0','#E3F5B1','#D4FDEA'],intensity:54,softness:80,duration:16},
        balance:{posColor:'#E4FEDE',negColor:'#ABCDFA',blend:55,fade:35,alpha:100},
        progress:['#F8F676','#E0FD98','#CFFEC5','#D2FEE5']
      }
    },
    {
      name:'Коралл',
      note:'Контраст: персик, коралл и малина — тёплая пара к бирюзе.',
      energy:{
        eat:  {c0:'#FDD5B8',cm:'#FEA195',c1:'#FA618E',mw:30,s0:59,s1:77,a0:80,a1:96},
        spent:{c0:'#FA618E',cm:'#FEA195',c1:'#FDD5B8',mw:30,s0:17,s1:45,a0:84,a1:98},
        track:20
      },
      bars:{hues:{pink:5,violet:340,blue:35,teal:68},chroma:.15,from:.82,to:.7,over:.55,dot:.74,track:24},
      day:{
        flow:{mode:'flow',colors:['#FEEFE0','#FFFFFF','#FFE4E1'],intensity:50,softness:82,duration:18},
        balance:{posColor:'#FEDAB9',negColor:'#FA618E',blend:55,fade:35,alpha:100},
        progress:['#FA618E','#FC9890','#FEC2A4','#FED9BA']
      }
    },
    {
      name:'Жемчуг',
      note:'Мягкий: белая заливка с голубым и сиреневым отливом.',
      energy:{
        eat:  {c0:'#FFFFFF',cm:'#E6FAFA',c1:'#E9E9FF',mw:30,s0:59,s1:77,a0:78,a1:96},
        spent:{c0:'#E9E9FF',cm:'#E6FAFA',c1:'#FFFFFF',mw:30,s0:17,s1:45,a0:80,a1:97},
        track:18
      },
      bars:{hues:{pink:350,violet:305,blue:270,teal:100},chroma:.04,from:.985,to:.93,over:.8,dot:.96,track:14},
      day:{
        flow:{mode:'shimmer',colors:['#F0FFFA','#FFFFFF','#E4EBFD'],intensity:46,softness:88,duration:22},
        balance:{posColor:'#FFFFFF',negColor:'#E1D2FF',blend:55,fade:35,alpha:98},
        progress:['#E7E5FD','#E7F4FE','#FFFFFF','#EDFDF5']
      }
    }
  ],

  /* ── Бордо ── */
  'happy-ref-bordeaux-v1':[
    {
      name:'Пион',
      note:'В тон: пудровый, розовый и орхидея — светлые оттенки самого бордо.',
      energy:{
        eat:  {c0:'#FEAEBB',cm:'#FE7BB3',c1:'#D869EA',mw:30,s0:59,s1:77,a0:66,a1:86},
        spent:{c0:'#D869EA',cm:'#FE7BB3',c1:'#FEAEBB',mw:30,s0:17,s1:45,a0:72,a1:94},
        track:20
      },
      bars:{hues:{pink:5,violet:340,blue:318,teal:30},chroma:.14,from:.87,to:.75,over:.6,dot:.81,track:22},
      day:{
        flow:{mode:'flow',colors:['#F38CB1','#CA7ECE','#FBB5BA'],intensity:55,softness:78,duration:16},
        balance:{posColor:'#FCD2D1',negColor:'#D869EA',blend:55,fade:35,alpha:100},
        progress:['#D869EA','#F97CC1','#FCA9BA','#FED1D0']
      }
    },
    {
      name:'Мята и золото',
      note:'Контраст: холодная мята переходит в золото.',
      energy:{
        eat:  {c0:'#A5F9DE',cm:'#ECF9EE',c1:'#FCDA86',mw:30,s0:59,s1:77,a0:80,a1:96},
        spent:{c0:'#FCDA86',cm:'#ECF9EE',c1:'#A5F9DE',mw:30,s0:17,s1:45,a0:84,a1:98},
        track:20
      },
      bars:{hues:{pink:88,violet:135,blue:172,teal:205},chroma:.1,from:.93,to:.81,over:.65,dot:.87,track:22},
      day:{
        flow:{mode:'flow',colors:['#D5F8EA','#FFFFFF','#F7EFD1'],intensity:46,softness:82,duration:18},
        balance:{posColor:'#9EFBDA',negColor:'#FCD176',blend:55,fade:35,alpha:100},
        progress:['#FCDA86','#F9F6DF','#A5F9DE','#B1F8F2']
      }
    },
    {
      name:'Пудра',
      note:'Мягкий: тёплый белый с пудрово-розовым отливом.',
      energy:{
        eat:  {c0:'#FFF9F4',cm:'#FDE4E7',c1:'#F4D1F0',mw:30,s0:59,s1:77,a0:68,a1:90},
        spent:{c0:'#F4D1F0',cm:'#FDE4E7',c1:'#FFF9F4',mw:30,s0:17,s1:45,a0:74,a1:94},
        track:20
      },
      bars:{hues:{pink:350,violet:305,blue:262,teal:180},chroma:.05,from:.95,to:.87,over:.74,dot:.91,track:18},
      day:{
        flow:{mode:'shimmer',colors:['#F6CBD0','#FFF8F2','#E7CDEC'],intensity:44,softness:85,duration:20},
        balance:{posColor:'#FFF6EE',negColor:'#EFC0E3',blend:55,fade:35,alpha:96},
        progress:['#F4D1F0','#FEDEE7','#FFF5ED','#FFFFFF']
      }
    }
  ],

  /* ── Фиолетовый бриз ── */
  'happy-ref-sport-v1':[
    {
      name:'Розовый бриз',
      note:'В тон: сиреневый свет и розовый из свечения фона.',
      energy:{
        eat:  {c0:'#FEB6EE',cm:'#FD97D2',c1:'#FF6CAE',mw:30,s0:59,s1:77,a0:66,a1:86},
        spent:{c0:'#FF6CAE',cm:'#FD97D2',c1:'#FEB6EE',mw:30,s0:17,s1:45,a0:72,a1:94},
        track:20
      },
      bars:{hues:{pink:10,violet:350,blue:328,teal:300},chroma:.14,from:.88,to:.77,over:.62,dot:.82,track:22},
      day:{
        flow:{mode:'flow',colors:['#FABAE4','#E6CBFB','#FDD9E9'],intensity:55,softness:80,duration:16},
        balance:{posColor:'#FCD7F8',negColor:'#FF6CAE',blend:55,fade:35,alpha:100},
        progress:['#FF6CAE','#FD97D2','#FEB6EE','#F7DEFD']
      }
    },
    {
      name:'Лайм',
      note:'Контраст: лайм, лимон и золото — яркая пара к фиолетовому.',
      energy:{
        eat:  {c0:'#D5FB99',cm:'#FEF69D',c1:'#FED488',mw:30,s0:59,s1:77,a0:80,a1:96},
        spent:{c0:'#FED488',cm:'#FEF69D',c1:'#D5FB99',mw:30,s0:17,s1:45,a0:84,a1:98},
        track:20
      },
      bars:{hues:{pink:60,violet:85,blue:108,teal:130},chroma:.13,from:.95,to:.85,over:.7,dot:.9,track:22},
      day:{
        flow:{mode:'flow',colors:['#F4F9DB','#FFFFFF','#FCF1D4'],intensity:48,softness:82,duration:18},
        balance:{posColor:'#E1FCA0',negColor:'#FDB07B',blend:55,fade:35,alpha:100},
        progress:['#FED488','#FEEC96','#EBF990','#D2FC9C']
      }
    },
    {
      name:'Жемчуг',
      note:'Мягкий: белая заливка с голубым и розовым отливом.',
      energy:{
        eat:  {c0:'#FFFFFF',cm:'#E3F0FF',c1:'#FEDCF5',mw:30,s0:59,s1:77,a0:68,a1:90},
        spent:{c0:'#FEDCF5',cm:'#E3F0FF',c1:'#FFFFFF',mw:30,s0:17,s1:45,a0:74,a1:94},
        track:20
      },
      bars:{hues:{pink:350,violet:305,blue:262,teal:180},chroma:.045,from:.975,to:.9,over:.78,dot:.94,track:16},
      day:{
        flow:{mode:'shimmer',colors:['#E3E6FC','#FFFFFF','#F8DFF5'],intensity:42,softness:85,duration:20},
        balance:{posColor:'#FFFFFF',negColor:'#FFC3E4',blend:55,fade:35,alpha:96},
        progress:['#FED7F1','#EAE8FD','#FFFFFF','#E4F5FE']
      }
    }
  ],

  /* ── Золотой закат ── */
  'happy-ref-golden-sunset-v1':[
    {
      name:'Закат',
      note:'В тон: золото, абрикос и розовый — свет самого заката.',
      energy:{
        eat:  {c0:'#FEE6AA',cm:'#FDBB80',c1:'#FA8B95',mw:30,s0:59,s1:77,a0:66,a1:86},
        spent:{c0:'#FA8B95',cm:'#FDBB80',c1:'#FEE6AA',mw:30,s0:17,s1:45,a0:72,a1:94},
        track:20
      },
      bars:{hues:{pink:10,violet:345,blue:50,teal:85},chroma:.12,from:.91,to:.79,over:.63,dot:.85,track:22},
      day:{
        flow:{mode:'flow',colors:['#F3B680','#FB998C','#F3D79E'],intensity:58,softness:78,duration:18},
        balance:{posColor:'#FFE6AA',negColor:'#F080B8',blend:55,fade:35,alpha:100},
        progress:['#FA8B9A','#FDAF88','#FCD8A1','#FDEFBA']
      }
    },
    {
      name:'Синий час',
      note:'Контраст: холодный голубой и сиреневый, как небо над закатом.',
      energy:{
        eat:  {c0:'#C0F2FF',cm:'#BAC8FA',c1:'#DAB0FA',mw:30,s0:59,s1:77,a0:76,a1:94},
        spent:{c0:'#DAB0FA',cm:'#BAC8FA',c1:'#C0F2FF',mw:30,s0:17,s1:45,a0:80,a1:96},
        track:20
      },
      bars:{hues:{pink:320,violet:290,blue:255,teal:212},chroma:.09,from:.92,to:.81,over:.66,dot:.87,track:22},
      day:{
        flow:{mode:'flow',colors:['#9CD3F1','#B4B7F7','#B8E8EF'],intensity:62,softness:80,duration:18},
        balance:{posColor:'#B0F6FE',negColor:'#DBA6F3',blend:55,fade:35,alpha:100},
        progress:['#DAB0FA','#BCC8FA','#B8E6FC','#C5F6F8']
      }
    },
    {
      name:'Перламутр',
      note:'Мягкий: кремово-белый с персиковым и розовым отливом.',
      energy:{
        eat:  {c0:'#FEF9F1',cm:'#FEEADB',c1:'#FEDADE',mw:30,s0:59,s1:77,a0:68,a1:90},
        spent:{c0:'#FEDADE',cm:'#FEEADB',c1:'#FEF9F1',mw:30,s0:17,s1:45,a0:74,a1:94},
        track:20
      },
      bars:{hues:{pink:5,violet:330,blue:60,teal:95},chroma:.05,from:.96,to:.88,over:.75,dot:.92,track:18},
      day:{
        flow:{mode:'shimmer',colors:['#F8D7BE','#FFF9F0','#FDD1D6'],intensity:44,softness:85,duration:20},
        balance:{posColor:'#FFF8EC',negColor:'#FBC2D6',blend:55,fade:35,alpha:96},
        progress:['#FDD6DC','#FEE6D7','#FEF8ED','#FFFFFF']
      }
    }
  ],

  /* ── Орхидея ── */
  'happy-ref-orchid-v1':[
    {
      name:'Лепесток',
      note:'В тон: белый лепесток, розовый и малиновый.',
      energy:{
        eat:  {c0:'#FEB9DB',cm:'#FE93C4',c1:'#F76689',mw:30,s0:59,s1:77,a0:66,a1:86},
        spent:{c0:'#F76689',cm:'#FE93C4',c1:'#FEB9DB',mw:30,s0:17,s1:45,a0:72,a1:94},
        track:20
      },
      bars:{hues:{pink:10,violet:355,blue:340,teal:320},chroma:.14,from:.88,to:.77,over:.62,dot:.82,track:20},
      day:{
        flow:{mode:'flow',colors:['#FDBADF','#E4ADF1','#FED9E6'],intensity:52,softness:80,duration:16},
        balance:{posColor:'#FDDEEE',negColor:'#F76689',blend:55,fade:35,alpha:100},
        progress:['#F76689','#FE93C4','#FEB9DB','#FFE1F4']
      }
    },
    {
      name:'Лист',
      note:'Контраст: мятный и салатовый, как лист рядом с цветком.',
      energy:{
        eat:  {c0:'#A3FAD4',cm:'#E5FCC1',c1:'#FDF299',mw:30,s0:59,s1:77,a0:80,a1:96},
        spent:{c0:'#FDF299',cm:'#E5FCC1',c1:'#A3FAD4',mw:30,s0:17,s1:45,a0:84,a1:98},
        track:20
      },
      bars:{hues:{pink:102,violet:130,blue:165,teal:195},chroma:.1,from:.95,to:.84,over:.68,dot:.9,track:20},
      day:{
        flow:{mode:'flow',colors:['#DCFBE9','#FFFFFF','#F0F6D4'],intensity:46,softness:82,duration:18},
        balance:{posColor:'#A9FDD4',negColor:'#FEED8C',blend:55,fade:35,alpha:100},
        progress:['#FDF299','#E4F9B5','#A8FACE','#B3F8EE']
      }
    },
    {
      name:'Жемчуг',
      note:'Мягкий: белая заливка с сиреневым и розовым отливом.',
      energy:{
        eat:  {c0:'#FFFFFF',cm:'#F1EBFE',c1:'#FEDDEC',mw:30,s0:59,s1:77,a0:72,a1:92},
        spent:{c0:'#FEDDEC',cm:'#F1EBFE',c1:'#FFFFFF',mw:30,s0:17,s1:45,a0:76,a1:95},
        track:20
      },
      bars:{hues:{pink:350,violet:305,blue:262,teal:180},chroma:.04,from:.985,to:.92,over:.8,dot:.95,track:15},
      day:{
        flow:{mode:'shimmer',colors:['#F1DDF6','#FFFFFF','#E3E6FE'],intensity:42,softness:85,duration:20},
        balance:{posColor:'#FFFFFF',negColor:'#FDC5DE',blend:55,fade:35,alpha:96},
        progress:['#FDD9E9','#F5E9FF','#FFFFFF','#F3F4FE']
      }
    },
    /* 23.11.2026: ещё четыре варианта для новой «Орхидеи» (Астамур: «придумай мне орхидею тоже, несколько вариантов») */
    {
      name:'Сирень',
      note:'Прохладная: сирень, барвинок и лёд — спокойнее фона.',
      energy:{
        eat:  {c0:'#EADFFF',cm:'#BDB6FF',c1:'#A6DDFF',mw:30,s0:59,s1:77,a0:74,a1:94},
        spent:{c0:'#A6DDFF',cm:'#BDB6FF',c1:'#EADFFF',mw:30,s0:17,s1:45,a0:78,a1:96},
        track:18
      },
      bars:{hues:{pink:320,violet:295,blue:270,teal:235},chroma:.09,from:.93,to:.83,over:.68,dot:.88,track:18},
      day:{
        flow:{mode:'flow',colors:['#E0D2FF','#BFC4FF','#CBEAFF'],intensity:52,softness:82,duration:18},
        balance:{posColor:'#C4E6FF',negColor:'#F0B8E6',blend:55,fade:35,alpha:100},
        progress:['#F0B8E6','#D6BEFA','#BDC6FF','#A6DDFF']
      }
    },
    {
      name:'Шампань',
      note:'Тёплая: сливки, шампань и персик — золотой свет на фиолетовом.',
      energy:{
        eat:  {c0:'#FFF3D6',cm:'#FFDCA6',c1:'#FFB9A6',mw:30,s0:59,s1:77,a0:78,a1:96},
        spent:{c0:'#FFB9A6',cm:'#FFDCA6',c1:'#FFF3D6',mw:30,s0:17,s1:45,a0:82,a1:97},
        track:18
      },
      bars:{hues:{pink:25,violet:50,blue:75,teal:92},chroma:.1,from:.93,to:.82,over:.66,dot:.87,track:18},
      day:{
        flow:{mode:'flow',colors:['#FFF0D0','#FFFFFF','#FFDCCB'],intensity:48,softness:84,duration:18},
        balance:{posColor:'#FFF3D6',negColor:'#FFB9A6',blend:55,fade:35,alpha:100},
        progress:['#FFB9A6','#FFCDA4','#FFE2B6','#FFF3D6']
      }
    },
    {
      name:'Слива',
      note:'В тон кнопке: светлая слива, орхидея и фиалка.',
      energy:{
        eat:  {c0:'#F6CDF2',cm:'#DBA0EE',c1:'#B692F6',mw:30,s0:59,s1:77,a0:70,a1:90},
        spent:{c0:'#B692F6',cm:'#DBA0EE',c1:'#F6CDF2',mw:30,s0:17,s1:45,a0:74,a1:94},
        track:18
      },
      bars:{hues:{pink:335,violet:318,blue:300,teal:282},chroma:.12,from:.88,to:.77,over:.62,dot:.82,track:18},
      day:{
        flow:{mode:'flow',colors:['#F2C6F0','#D3A6F2','#FBE0F6'],intensity:52,softness:80,duration:16},
        balance:{posColor:'#F6CDF2',negColor:'#B692F6',blend:55,fade:35,alpha:100},
        progress:['#B692F6','#CD9CF1','#E4B4F0','#F6CDF2']
      }
    },
    {
      name:'Северное сияние',
      note:'Свежая: мята, небо и сирень — холодный свет без жёлтого.',
      energy:{
        eat:  {c0:'#B9F7E4',cm:'#A9D8FF',c1:'#D4BCFF',mw:30,s0:59,s1:77,a0:76,a1:95},
        spent:{c0:'#D4BCFF',cm:'#A9D8FF',c1:'#B9F7E4',mw:30,s0:17,s1:45,a0:80,a1:97},
        track:18
      },
      bars:{hues:{pink:300,violet:270,blue:230,teal:175},chroma:.09,from:.94,to:.84,over:.68,dot:.89,track:18},
      day:{
        flow:{mode:'flow',colors:['#C4F6E6','#B6DCFF','#E0D0FF'],intensity:50,softness:82,duration:20},
        balance:{posColor:'#B9F7E4',negColor:'#D4BCFF',blend:55,fade:35,alpha:100},
        progress:['#D4BCFF','#B9CDFF','#A9E2F6','#B9F7E4']
      }
    },
    /* 23.11.2026: собрал Астамур в студии (скриншоты 21:13): кольцо и строки — его значения; стык «Тает», 55° */
    {
      name:'Фуксия',
      note:'Собрал Астамур: фуксия, фиалка и пурпур — ярко, в цвет самой орхидеи.',
      energy:{
        eat:  {c0:'#FF60FF',cm:'#7C5CFF',c1:'#FF00FF',mw:6,s0:4,s1:96,a0:74,a1:92},
        spent:{c0:'#FF00FF',cm:'#892AFC',c1:'#C934FF',mw:6,s0:4,s1:96,a0:74,a1:92},
        track:20
      },
      join:{kind:'fade',len:55,from:15,via:[],shadow:38,size:7.5},
      bars:{hues:{pink:323,violet:323,blue:323,teal:323},chroma:.275,dot:.83,from:.86,to:.72,over:.65,track:27},
      day:{
        flow:{mode:'flow',colors:['#FF8CFF','#9C7CFF','#E05CFF'],intensity:62,softness:76,duration:16},
        balance:{posColor:'#9C7CFF',negColor:'#FF60FF',blend:55,fade:35,alpha:100},
        progress:['#FF00FF','#C934FF','#892AFC','#7C5CFF']
      }
    }
  ],

  /* 23.11.2026: новые темы «Малахит» и «Ягодное небо» */
  /* ── Малахит ── */
  'happy-ref-malachite-v1':[
    {
      name:'Изумруд',
      note:'В тон: светлая мята, изумруд и морская волна — тот же камень, но на свету.',
      energy:{
        eat:  {c0:'#C6F7E6',cm:'#74E0C0',c1:'#3CC4CC',mw:30,s0:59,s1:77,a0:78,a1:96},
        spent:{c0:'#3CC4CC',cm:'#74E0C0',c1:'#C6F7E6',mw:30,s0:17,s1:45,a0:82,a1:97},
        track:18
      },
      bars:{hues:{pink:150,violet:168,blue:186,teal:204},chroma:.11,from:.92,to:.8,over:.64,dot:.86,track:18},
      day:{
        flow:{mode:'flow',colors:['#8FE3C8','#5CCFCB','#C9F6E6'],intensity:54,softness:80,duration:18},
        balance:{posColor:'#C6F7E6',negColor:'#F2B6A0',blend:55,fade:35,alpha:100},
        progress:['#3CC4CC','#5FD6C4','#93E8CD','#C6F7E6']
      }
    },
    {
      name:'Медь',
      note:'Контраст: сливочный, медь и терракота — как прожилки в малахите.',
      energy:{
        eat:  {c0:'#FBE6C4',cm:'#F2B88C',c1:'#E5866E',mw:30,s0:59,s1:77,a0:80,a1:96},
        spent:{c0:'#E5866E',cm:'#F2B88C',c1:'#FBE6C4',mw:30,s0:17,s1:45,a0:84,a1:98},
        track:18
      },
      bars:{hues:{pink:25,violet:42,blue:60,teal:80},chroma:.11,from:.88,to:.76,over:.6,dot:.81,track:18},
      day:{
        flow:{mode:'flow',colors:['#F6DDBB','#EDB592','#FDF0DC'],intensity:50,softness:82,duration:18},
        balance:{posColor:'#FBE6C4',negColor:'#E5866E',blend:55,fade:35,alpha:100},
        progress:['#E5866E','#EDA47F','#F5C8A0','#FBE6C4']
      }
    },
    {
      name:'Перламутр',
      note:'Мягкий: белая заливка с мятным и розовым отливом.',
      energy:{
        eat:  {c0:'#FFFFFF',cm:'#DFF7EF',c1:'#F7DDEB',mw:30,s0:59,s1:77,a0:74,a1:94},
        spent:{c0:'#F7DDEB',cm:'#DFF7EF',c1:'#FFFFFF',mw:30,s0:17,s1:45,a0:78,a1:96},
        track:16
      },
      bars:{hues:{pink:350,violet:305,blue:200,teal:165},chroma:.04,from:.985,to:.93,over:.8,dot:.96,track:14},
      day:{
        flow:{mode:'shimmer',colors:['#EAFBF5','#FFFFFF','#F9E9F1'],intensity:46,softness:88,duration:22},
        balance:{posColor:'#FFFFFF',negColor:'#F7CFE0',blend:55,fade:35,alpha:98},
        progress:['#F7DDEB','#F1F1F4','#FFFFFF','#DFF7EF']
      }
    }
  ],

  /* ── Ягодное небо ── */
  'happy-ref-berry-sky-v1':[
    {
      name:'Зефир',
      note:'В тон: розовый, сиреневый и небесный — цвета самого фона, но светлые.',
      energy:{
        eat:  {c0:'#FFD9EA',cm:'#D9C4FF',c1:'#B5DCFF',mw:30,s0:59,s1:77,a0:78,a1:96},
        spent:{c0:'#B5DCFF',cm:'#D9C4FF',c1:'#FFD9EA',mw:30,s0:17,s1:45,a0:82,a1:97},
        track:20
      },
      bars:{hues:{pink:350,violet:315,blue:280,teal:240},chroma:.09,from:.93,to:.83,over:.68,dot:.88,track:20},
      day:{
        flow:{mode:'flow',colors:['#FFC9E2','#D2C0FA','#BEE0FF'],intensity:54,softness:80,duration:18},
        balance:{posColor:'#C9E4FF',negColor:'#FFB9D6',blend:55,fade:35,alpha:100},
        progress:['#FFB9D6','#E4C3F5','#C9CDFF','#B5DCFF']
      }
    },
    {
      name:'Лимонад',
      note:'Контраст: лимон, абрикос и персик — солнце на ягодном небе.',
      energy:{
        eat:  {c0:'#FFF4B8',cm:'#FFD591',c1:'#FFAE94',mw:30,s0:59,s1:77,a0:80,a1:96},
        spent:{c0:'#FFAE94',cm:'#FFD591',c1:'#FFF4B8',mw:30,s0:17,s1:45,a0:84,a1:98},
        track:20
      },
      bars:{hues:{pink:30,violet:55,blue:80,teal:100},chroma:.11,from:.92,to:.8,over:.64,dot:.86,track:20},
      day:{
        flow:{mode:'flow',colors:['#FFF1C2','#FFFFFF','#FFDCC6'],intensity:50,softness:82,duration:18},
        balance:{posColor:'#FFF4B8',negColor:'#FFAE94',blend:55,fade:35,alpha:100},
        progress:['#FFAE94','#FFC592','#FFDFA2','#FFF4B8']
      }
    },
    {
      name:'Жемчуг',
      note:'Мягкий: белая заливка с розовым и голубым отливом.',
      energy:{
        eat:  {c0:'#FFFFFF',cm:'#FBEAF5',c1:'#E3EEFF',mw:30,s0:59,s1:77,a0:78,a1:96},
        spent:{c0:'#E3EEFF',cm:'#FBEAF5',c1:'#FFFFFF',mw:30,s0:17,s1:45,a0:80,a1:97},
        track:18
      },
      bars:{hues:{pink:350,violet:305,blue:270,teal:240},chroma:.04,from:.985,to:.93,over:.8,dot:.96,track:14},
      day:{
        flow:{mode:'shimmer',colors:['#FFF0F7','#FFFFFF','#E6EFFF'],intensity:46,softness:88,duration:22},
        balance:{posColor:'#FFFFFF',negColor:'#FFCFE4',blend:55,fade:35,alpha:98},
        progress:['#FBDDEC','#F3EBFA','#FFFFFF','#E3EEFF']
      }
    }
  ],

  /* ── Спокойный синий ── */
  'happy-ref-calm-blue-v1':[
    {
      name:'Морозное утро',
      note:'В тон: ледяной голубой, небесный и сиреневый.',
      energy:{
        eat:  {c0:'#BFF2FF',cm:'#8CC3FC',c1:'#B3A7FB',mw:30,s0:59,s1:77,a0:66,a1:86},
        spent:{c0:'#B3A7FB',cm:'#8CC3FC',c1:'#BFF2FF',mw:30,s0:17,s1:45,a0:72,a1:94},
        track:20
      },
      bars:{hues:{pink:300,violet:275,blue:250,teal:215},chroma:.09,from:.9,to:.78,over:.62,dot:.84,track:20},
      day:{
        flow:{mode:'flow',colors:['#92CEE7','#8AB4EA','#B9E8F0'],intensity:55,softness:82,duration:20},
        balance:{posColor:'#BFF2FD',negColor:'#B9A9FE',blend:55,fade:35,alpha:100},
        progress:['#B3A7FB','#98BBFB','#9DDAFE','#BEF2FD']
      }
    },
    {
      name:'Янтарь',
      note:'Контраст: тёплый свет лампы — крем, абрикос и мягкий коралл.',
      energy:{
        eat:  {c0:'#FCDDA5',cm:'#FEBA7E',c1:'#F89177',mw:30,s0:59,s1:77,a0:76,a1:94},
        spent:{c0:'#F89177',cm:'#FEBA7E',c1:'#FCDDA5',mw:30,s0:17,s1:45,a0:80,a1:96},
        track:20
      },
      bars:{hues:{pink:30,violet:52,blue:72,teal:92},chroma:.1,from:.91,to:.79,over:.63,dot:.85,track:20},
      day:{
        flow:{mode:'flow',colors:['#F9E9CE','#FAF5EA','#FDDDC9'],intensity:46,softness:84,duration:20},
        balance:{posColor:'#FEE1A7',negColor:'#F8917A',blend:55,fade:35,alpha:100},
        progress:['#F89177','#FFB481','#FFD298','#FDE5B3']
      }
    },
    {
      name:'Туман',
      note:'Мягкий: бело-серый с едва заметным голубым и сиреневым.',
      energy:{
        eat:  {c0:'#F1F6FA',cm:'#DAE6F3',c1:'#E1D9F2',mw:30,s0:59,s1:77,a0:62,a1:84},
        spent:{c0:'#E1D9F2',cm:'#DAE6F3',c1:'#F1F6FA',mw:30,s0:17,s1:45,a0:68,a1:90},
        track:20
      },
      bars:{hues:{pink:330,violet:295,blue:250,teal:205},chroma:.035,from:.96,to:.88,over:.75,dot:.92,track:16},
      day:{
        flow:{mode:'breathe',colors:['#C7DBEA','#E1E9F2','#D7D4EE'],intensity:40,softness:88,duration:10},
        balance:{posColor:'#F1F6FA',negColor:'#DBC8EA',blend:55,fade:35,alpha:94},
        progress:['#DED5F2','#D9E1F3','#EDF2F8','#FFFFFF']
      }
    }
  ],

  /* ── Ночная бухта ── */
  'happy-ref-night-bay-v1':[
    {
      name:'Тихая вода',
      note:'В тон: приглушённая бирюза и сизо-голубой.',
      energy:{
        eat:  {c0:'#A7DDDC',cm:'#77B6C8',c1:'#8FA4D1',mw:30,s0:59,s1:77,a0:70,a1:90},
        spent:{c0:'#8FA4D1',cm:'#77B6C8',c1:'#A7DDDC',mw:30,s0:17,s1:45,a0:74,a1:94},
        track:16
      },
      bars:{hues:{pink:265,violet:235,blue:210,teal:185},chroma:.065,from:.84,to:.7,over:.54,dot:.78,track:16},
      day:{
        flow:{mode:'flow',colors:['#71AAAD','#588EA8','#93C2BD'],intensity:50,softness:82,duration:24},
        balance:{posColor:'#A7E1DE',negColor:'#90A3D4',blend:55,fade:35,alpha:96},
        progress:['#8FA4D1','#7FB2D1','#90C9D3','#ABE0DD']
      }
    },
    {
      name:'Костёр',
      note:'Контраст: песок, янтарь и терракота — тёплый отблеск темы.',
      energy:{
        eat:  {c0:'#EFDCB5',cm:'#E4AA71',c1:'#D67D5E',mw:30,s0:59,s1:77,a0:74,a1:92},
        spent:{c0:'#D67D5E',cm:'#E4AA71',c1:'#EFDCB5',mw:30,s0:17,s1:45,a0:78,a1:95},
        track:16
      },
      bars:{hues:{pink:38,violet:55,blue:72,teal:90},chroma:.085,from:.86,to:.72,over:.56,dot:.8,track:16},
      day:{
        flow:{mode:'flow',colors:['#C89A6F','#BB7A60','#D3C2A0'],intensity:52,softness:82,duration:24},
        balance:{posColor:'#F0DCB1',negColor:'#D77C60',blend:55,fade:35,alpha:96},
        progress:['#D67D5E','#DF9D6F','#E8BF8E','#EFE0BC']
      }
    },
    {
      name:'Лунный свет',
      note:'Мягкий: серебристый, почти без цвета.',
      energy:{
        eat:  {c0:'#E0EAED',cm:'#BFD1D9',c1:'#CEC6DF',mw:30,s0:59,s1:77,a0:55,a1:78},
        spent:{c0:'#CEC6DF',cm:'#BFD1D9',c1:'#E0EAED',mw:30,s0:17,s1:45,a0:60,a1:86},
        track:15
      },
      bars:{hues:{pink:330,violet:290,blue:240,teal:200},chroma:.03,from:.9,to:.78,over:.62,dot:.85,track:15},
      day:{
        flow:{mode:'breathe',colors:['#AABBC0','#CFD9DD','#B0AEC3'],intensity:40,softness:88,duration:11},
        balance:{posColor:'#E3EDF1',negColor:'#C8B5D6',blend:55,fade:35,alpha:90},
        progress:['#CBC2DE','#C2CFDE','#DCE7EA','#ECF3F5']
      }
    },
    {
      name:'Рассвет',
      note:'Референс: ночной экран Sleep Cycle — бирюза, светлая середина и персик.',
      energy:{
        eat:  {c0:'#7DCDD9',cm:'#E3DDD1',c1:'#E8B184',mw:8,s0:20,s1:86,a0:72,a1:92},
        spent:{c0:'#E8B184',cm:'#E3DDD1',c1:'#7DCDD9',mw:8,s0:14,s1:80,a0:76,a1:95},
        track:15
      },
      bars:{hues:{pink:58,violet:82,blue:192,teal:210},chroma:.07,from:.86,to:.72,over:.56,dot:.8,track:15},
      day:{
        flow:{mode:'flow',colors:['#6BC8D3','#E5CEA5','#EFAE7C'],intensity:60,softness:84,duration:24},
        balance:{posColor:'#8ED9E2',negColor:'#E3A97D',blend:55,fade:35,alpha:96},
        progress:['#E3A97D','#E1CFAC','#A8D8D8','#7DCDD9']
      }
    }
  ],

  /* ── Полуночный ирис ── */
  'happy-ref-midnight-iris-v1':[
    {
      name:'Ирис',
      note:'В тон: лаванда, ирис и пыльная роза.',
      energy:{
        eat:  {c0:'#D0C2ED',cm:'#BF8FD4',c1:'#DF879B',mw:30,s0:59,s1:77,a0:70,a1:90},
        spent:{c0:'#DF879B',cm:'#BF8FD4',c1:'#D0C2ED',mw:30,s0:17,s1:45,a0:74,a1:94},
        track:16
      },
      bars:{hues:{pink:5,violet:340,blue:315,teal:290},chroma:.08,from:.85,to:.71,over:.55,dot:.79,track:16},
      day:{
        flow:{mode:'flow',colors:['#A989C2','#AB7097','#BAB0DA'],intensity:50,softness:82,duration:24},
        balance:{posColor:'#D5C9F4',negColor:'#DF879B',blend:55,fade:35,alpha:96},
        progress:['#DF879B','#CF8AC0','#C4A1DB','#D2C6F1']
      }
    },
    {
      name:'Шалфей',
      note:'Контраст: серо-зелёный шалфей и бледное золото.',
      energy:{
        eat:  {c0:'#CAE7CA',cm:'#9ECBA6',c1:'#E1D195',mw:30,s0:59,s1:77,a0:74,a1:92},
        spent:{c0:'#E1D195',cm:'#9ECBA6',c1:'#CAE7CA',mw:30,s0:17,s1:45,a0:78,a1:95},
        track:16
      },
      bars:{hues:{pink:95,violet:120,blue:148,teal:175},chroma:.065,from:.88,to:.74,over:.58,dot:.82,track:16},
      day:{
        flow:{mode:'flow',colors:['#8AB091','#6D9E8D','#C0C295'],intensity:50,softness:82,duration:24},
        balance:{posColor:'#C6E9CA',negColor:'#DEC98A',blend:55,fade:35,alpha:96},
        progress:['#E1D195','#C7D5A2','#A6D1AB','#C8E8CD']
      }
    },
    {
      name:'Пепел розы',
      note:'Мягкий: серо-розовый, почти без цвета.',
      energy:{
        eat:  {c0:'#F0E8EF',cm:'#E0CEDE',c1:'#E5BFC6',mw:30,s0:59,s1:77,a0:55,a1:78},
        spent:{c0:'#E5BFC6',cm:'#E0CEDE',c1:'#F0E8EF',mw:30,s0:17,s1:45,a0:60,a1:86},
        track:15
      },
      bars:{hues:{pink:5,violet:335,blue:300,teal:265},chroma:.03,from:.9,to:.78,over:.62,dot:.85,track:15},
      day:{
        flow:{mode:'breathe',colors:['#C3B1C1','#DDD4DC','#C8A7AE'],intensity:40,softness:88,duration:11},
        balance:{posColor:'#F0E8EF',negColor:'#E0AEB8',blend:55,fade:35,alpha:90},
        progress:['#E5BFC6','#E2C9D8','#EBE1E9','#F5F0F4']
      }
    },
    {
      name:'Рассвет',
      note:'Референс: ночной экран Sleep Cycle — бирюза, светлая середина и персик.',
      energy:{
        eat:  {c0:'#7DCDD9',cm:'#E3DDD1',c1:'#E8B184',mw:8,s0:20,s1:86,a0:72,a1:92},
        spent:{c0:'#E8B184',cm:'#E3DDD1',c1:'#7DCDD9',mw:8,s0:14,s1:80,a0:76,a1:95},
        track:15
      },
      bars:{hues:{pink:58,violet:82,blue:192,teal:210},chroma:.07,from:.86,to:.72,over:.56,dot:.8,track:15},
      day:{
        flow:{mode:'flow',colors:['#6BC8D3','#E5CEA5','#EFAE7C'],intensity:60,softness:84,duration:24},
        balance:{posColor:'#8ED9E2',negColor:'#E3A97D',blend:55,fade:35,alpha:96},
        progress:['#E3A97D','#E1CFAC','#A8D8D8','#7DCDD9']
      }
    }
  ],

  /* ── Неоновая ночь ── */
  'happy-ref-neon-night-v1':[
    {
      name:'Сумерки',
      note:'В тон: сизо-голубой, фиолетовый и орхидея.',
      energy:{
        eat:  {c0:'#BDC8F9',cm:'#A18EE8',c1:'#D78CD4',mw:30,s0:59,s1:77,a0:70,a1:90},
        spent:{c0:'#D78CD4',cm:'#A18EE8',c1:'#BDC8F9',mw:30,s0:17,s1:45,a0:74,a1:94},
        track:16
      },
      bars:{hues:{pink:328,violet:305,blue:285,teal:262},chroma:.09,from:.85,to:.71,over:.55,dot:.79,track:16},
      day:{
        flow:{mode:'flow',colors:['#8B88D3','#9F71B4','#9BB0E5'],intensity:52,softness:82,duration:22},
        balance:{posColor:'#C2CFFB',negColor:'#D98CD2',blend:55,fade:35,alpha:96},
        progress:['#D78CD4','#AB8BE3','#A7A9EF','#BCCCFD']
      }
    },
    {
      name:'Тихий неон',
      note:'Контраст: бирюза, голубой и розовый — тот же неон, но приглушённый.',
      energy:{
        eat:  {c0:'#90E7DE',cm:'#8BBCEF',c1:'#F1A1CE',mw:30,s0:59,s1:77,a0:72,a1:92},
        spent:{c0:'#F1A1CE',cm:'#8BBCEF',c1:'#90E7DE',mw:30,s0:17,s1:45,a0:76,a1:95},
        track:16
      },
      bars:{hues:{pink:345,violet:300,blue:250,teal:188},chroma:.085,from:.87,to:.73,over:.57,dot:.81,track:16},
      day:{
        flow:{mode:'flow',colors:['#63B5B4','#6198C6','#89CDC3'],intensity:52,softness:82,duration:22},
        balance:{posColor:'#8EEBE2',negColor:'#F3A0CA',blend:55,fade:35,alpha:96},
        progress:['#F1A1CE','#B0A6ED','#7BD3E9','#94EADF']
      }
    },
    {
      name:'Серебро',
      note:'Мягкий: серебристо-сиреневый, почти без цвета.',
      energy:{
        eat:  {c0:'#E6E7F2',cm:'#D0CEE7',c1:'#DAC1DF',mw:30,s0:59,s1:77,a0:55,a1:78},
        spent:{c0:'#DAC1DF',cm:'#D0CEE7',c1:'#E6E7F2',mw:30,s0:17,s1:45,a0:60,a1:86},
        track:15
      },
      bars:{hues:{pink:330,violet:300,blue:280,teal:250},chroma:.035,from:.9,to:.78,over:.62,dot:.85,track:15},
      day:{
        flow:{mode:'breathe',colors:['#B4B5CE','#D6D6E1','#BEA8C3'],intensity:40,softness:88,duration:11},
        balance:{posColor:'#EAEAF5',negColor:'#D2B1D3',blend:55,fade:35,alpha:90},
        progress:['#DAC1DF','#D5CCE8','#E3E3F2','#F1F1F8']
      }
    },
    {
      name:'Рассвет',
      note:'Референс: ночной экран Sleep Cycle — бирюза, светлая середина и персик.',
      energy:{
        eat:  {c0:'#7DCDD9',cm:'#E3DDD1',c1:'#E8B184',mw:8,s0:20,s1:86,a0:72,a1:92},
        spent:{c0:'#E8B184',cm:'#E3DDD1',c1:'#7DCDD9',mw:8,s0:14,s1:80,a0:76,a1:95},
        track:15
      },
      bars:{hues:{pink:58,violet:82,blue:192,teal:210},chroma:.07,from:.86,to:.72,over:.56,dot:.8,track:15},
      day:{
        flow:{mode:'flow',colors:['#6BC8D3','#E5CEA5','#EFAE7C'],intensity:60,softness:84,duration:24},
        balance:{posColor:'#8ED9E2',negColor:'#E3A97D',blend:55,fade:35,alpha:96},
        progress:['#E3A97D','#E1CFAC','#A8D8D8','#7DCDD9']
      }
    }
  ]
  }
};
