const menuData = {
  main: [
    { 
      id: 5, 
      name: 'دجاج ولحم مع أرز', 
      description: 'سلمون أطلنطي مع الزبدة والزيت والخضروات', 
      price: 5000,
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop&auto=format'
    }
  ],
  bbq: [
    { 
      id: 5, 
      name: 'كباب لحم', 
      description: 'سلمون أطلنطي مع الزبدة والزيت والخضروات', 
      price: 4000,
      image: 'https://images.ntviraq.com/wene/1620221921frxd5_iwqaejqzx.jpg'
    },
    { 
      id: 6, 
      name: 'كباب محشي', 
      description: 'شريحة لحم 12 أونصة مع الزبدة والثوم', 
      price: 4000,
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&auto=format'
    },
    { 
      id: 7, 
      name: 'قطعة لحم', 
      description: 'صدر دجاج مع الخبز والجبن والمارينارا', 
      price: 4000,
      image: 'https://45.nasin.systems/uploads/restaurantsitems/thumbnails/2712211253038654-1640606196.jpg'
    },
    { 
      id: 8, 
      name: 'قطعة دجاج', 
      description: 'جبن مع الخضار وصلصة البيستو', 
      price: 4000,
      image: 'https://instalacarte.com/media/cache/mobile_image/product/2375/27369/c39d8ffd5025f75e28243e9805779d69.jpeg'
    },
    { 
      id: 9, 
      name: 'أجنحة دجاج', 
      description: 'سمك مشوي مع الليمون وصلصة تشيبوتلي', 
      price: 4000,
      image: 'https://esta.krd/wp-content/uploads/2024/08/R.jpg'
    },
    { 
      id: 10, 
      name: 'أضلاع', 
      description: 'أضلاع مقلية مع صلصة باربكيو منزلية', 
      price: 4000,
      image: 'https://cdnuploads.aa.com.tr/uploads/Contents/2021/04/17/thumbs_b_c_e540e224d2d477243686cebfdbaf52a7.jpg?v=142118'
    },
    { 
      id: 11, 
      name: 'قلب', 
      description: 'أضلاع مقلية مع صلصة باربكيو منزلية', 
      price: 4000,
      image: 'https://cdnuploads.aa.com.tr/uploads/Contents/2021/04/17/thumbs_b_c_e540e224d2d477243686cebfdbaf52a7.jpg?v=142118'
    },
    { 
      id: 12, 
      name: 'كلاوي', 
      description: 'أضلاع مقلية مع صلصة باربكيو منزلية', 
      price: 4000,
      image: 'https://cdnuploads.aa.com.tr/uploads/Contents/2021/04/17/thumbs_b_c_e540e224d2d477243686cebfdbaf52a7.jpg?v=142118'
    },
    { 
      id: 13, 
      name: 'سيخ ١ دونغ', 
      description: 'أضلاع مقلية مع صلصة باربكيو منزلية', 
      price: 4000,
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSN27ac9HtISXKPYf58chYbatQhiB4p7a4DNAWRYBCcV0OQbSfx5bCNh9Ef497603kAZhQ&usqp=CAU'
    }
  ],
  shawrma: [
    { 
      id: 11, 
      name: 'شاورما دجاج', 
      description: 'كيك شوكولاتة ساخن بحشوة وآيس كريم فانيلا', 
      price: 2000,
      image: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/%D0%A8%D0%B0%D1%83%D1%80%D0%BC%D0%B0_6.jpg'
    },
    { 
      id: 12, 
      name: 'شاورما لحم', 
      description: 'حلوى إيطالية كلاسيكية مع القهوة والماسكاربوني', 
      price: 2500,
      image: 'https://instalacarte.com/media/cache/mobile_image/product/2375/29682/431de6fd3a31ad432d50855619846a5b.jpeg'
    },
    { 
      id: 13, 
      name: 'صاج دجاج', 
      description: 'كيك شوكولاتة ساخن بحشوة وآيس كريم فانيلا', 
      price: 3000,
      image: 'https://images.deliveryhero.io/image/talabat/MenuItems/%D8%B5%D8%A7%D8%AC_%D8%AF%D8%AC%D8%A7%D8%AC63842664730861110638759197932512083.jpg'
    },
    { 
      id: 12, 
      name: 'صاج لحم', 
      description: 'حلوى إيطالية كلاسيكية مع القهوة والماسكاربوني', 
      price: 3500,
      image: 'https://images.deliveryhero.io/image/talabat/MenuItems/%D8%B5%D8%A7%D8%AC_%D8%AF%D8%AC%D8%A7%D8%AC63842664730861110638759197932512083.jpg'
    }
  ],
  drinks: [
    { 
      id: 15, 
      name: 'بيبسي', 
      description: 'محضر بالليمون والنعناع الطازج', 
      price: 500,
      image: 'https://cdn.metcash.media/image/upload/f_auto,c_limit,w_750,q_auto/igashop/images/806820'
    },
    { 
      id: 16, 
      name: 'دوغ', 
      description: 'مشروب لبني محلي تقليدي', 
      price: 500,
      image: 'https://cdn.shortpixel.ai/spai/q_lossless+ret_img+to_webp/imbibemagazine.com/wp-content/uploads/2024/12/yogurt-drinks-Salty-Mint-Yogurt-Soda-Doogh-crdt-john-valls-e1735342033870.jpg'
    },
    { 
      id: 17, 
      name: 'شاي', 
      description: 'أسود أو أخضر في كأس', 
      price: 500,
      image: 'https://images.ntviraq.com/nrt2/191120211053turkish_tea.jpg'
    }
  ]
};

export default menuData;
