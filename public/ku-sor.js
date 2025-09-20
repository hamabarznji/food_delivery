const menuData = {

  main: [
    { 
      id: 5, 
      name: ' مریشک و گۆشت و شلە', 
      description: 'سەلمۆنی ئاتلانتیک بە کەرە و زەیت و سەوزەکان', 
      price: 5000,
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop&auto=format'
    }],
  bbq: [
    { 
      id: 5, 
      name: 'کەبابی گۆشت', 
      description: 'سەلمۆنی ئاتلانتیک بە کەرە و زەیت و سەوزەکان', 
      price: 4000,
      image: 'https://images.ntviraq.com/wene/1620221921frxd5_iwqaejqzx.jpg'
    },
    { 
      id: 6, 
      name: ' کەبابی مەحشی', 
      description: 'قەتی 12oz پریمیم بە کەرە و کەچکۆڵی سیر', 
      price: 4000,
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&auto=format'
    },
    { 
      id: 7, 
      name: ' تکەی گۆشت', 
      description: 'سەنانەی مرۆش بە بۆرده و موزارێلا و مارینارا', 
      price: 4000,
      image: 'https://45.nasin.systems/uploads/restaurantsitems/thumbnails/2712211253038654-1640606196.jpg'
    },
    { 
      id: 8, 
      name: 'تکەی مریشک ', 
      description: 'پێنەی بە سەوزەکان و سۆسی پێستو', 
      price: 4000,
      image: 'https://instalacarte.com/media/cache/mobile_image/product/2375/27369/c39d8ffd5025f75e28243e9805779d69.jpeg'
    },
    { 
      id: 9, 
      name: ' باڵی مریشک', 
      description: 'ماهی گریلکراو بە کەلەبە و سۆسی چیپۆتڵ', 
      price: 4000,
      image: 'https://esta.krd/wp-content/uploads/2024/08/R.jpg'
    },
    { 
      id: 10, 
      name: 'جەرگ', 
      description: 'ڕیبز فڕێکراو بە سۆسی خانەوەی BBQ', 
      price: 4000,
      image: 'https://cdnuploads.aa.com.tr/uploads/Contents/2021/04/17/thumbs_b_c_e540e224d2d477243686cebfdbaf52a7.jpg?v=142118'
    }
    ,
      { 
      id: 11, 
      name: 'دڵ', 
      description: 'ڕیبز فڕێکراو بە سۆسی خانەوەی BBQ', 
      price: 4000,
      image: 'https://cdnuploads.aa.com.tr/uploads/Contents/2021/04/17/thumbs_b_c_e540e224d2d477243686cebfdbaf52a7.jpg?v=142118'
    },
      { 
      id: 12, 
      name: 'گورچیلە', 
      description: 'ڕیبز فڕێکراو بە سۆسی خانەوەی BBQ', 
      price: 4000,
      image: 'https://cdnuploads.aa.com.tr/uploads/Contents/2021/04/17/thumbs_b_c_e540e224d2d477243686cebfdbaf52a7.jpg?v=142118'
    },
     { 
      id: 13, 
      name: 'دونگ ١ شیش', 
      description: 'ڕیبز فڕێکراو بە سۆسی خانەوەی BBQ', 
      price: 4000,
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSN27ac9HtISXKPYf58chYbatQhiB4p7a4DNAWRYBCcV0OQbSfx5bCNh9Ef497603kAZhQ&usqp=CAU'
    }
  ],
  shawrma: [
    { 
      id: 11, 
      name: 'شاورمەی مریشک', 
      description: 'کیکی گرم شکولاتەی بە ناوەڕۆکی تێدا و یەخ وانیلا', 
      price: 2000,
      image: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/%D0%A8%D0%B0%D1%83%D1%80%D0%BC%D0%B0_6.jpg'
    },
    { 
      id: 12, 
      name: ' شاورمەی گۆشت', 
      description: 'دیسێرتی کلاسیکی ئیتالیا بە قاوە و ماسکارپۆن', 
      price: 2500,
      image: 'https://instalacarte.com/media/cache/mobile_image/product/2375/29682/431de6fd3a31ad432d50855619846a5b.jpeg'
    },

    { 
      id: 13, 
      name: 'ساجی مریشک', 
      description: 'کیکی گرم شکولاتەی بە ناوەڕۆکی تێدا و یەخ وانیلا', 
      price: 3000,
      image: 'https://images.deliveryhero.io/image/talabat/MenuItems/%D8%B5%D8%A7%D8%AC_%D8%AF%D8%AC%D8%A7%D8%AC63842664730861110638759197932512083.jpg'
    },
    { 
      id: 12, 
      name: ' ساجی گۆشت', 
      description: 'دیسێرتی کلاسیکی ئیتالیا بە قاوە و ماسکارپۆن', 
      price: 3500,
      image: 'https://images.deliveryhero.io/image/talabat/MenuItems/%D8%B5%D8%A7%D8%AC_%D8%AF%D8%AC%D8%A7%D8%AC63842664730861110638759197932512083.jpg'
    },
   
  ],
  drinks: [
    { 
      id: 15, 
      name: ' بیبسی', 
      description: 'دروستکراوە بە لیمۆن و نعناع تازە', 
      price: 500,
      image: 'https://cdn.metcash.media/image/upload/f_auto,c_limit,w_750,q_auto/igashop/images/806820'
    },
    { 
      id: 16, 
      name: 'دۆ', 
      description: 'هەڵبژاردنی بێری فەرمی ناوخۆی', 
      price:500,
      image: 'https://cdn.shortpixel.ai/spai/q_lossless+ret_img+to_webp/imbibemagazine.com/wp-content/uploads/2024/12/yogurt-drinks-Salty-Mint-Yogurt-Soda-Doogh-crdt-john-valls-e1735342033870.jpg'
    },
    { 
      id: 17, 
      name: 'چا', 
      description: 'سور یان سپی بە گەلاس', 
      price: 500,
      image: 'https://images.ntviraq.com/nrt2/191120211053turkish_tea.jpg'
    },

  ]
};

export default menuData;
