  const menuData = {
    appetizers: [
      { 
        id: 1, 
        name: 'Crispy Calamari', 
        description: 'Fresh squid rings with spicy marinara sauce', 
        price: 12.99,
        image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop&auto=format'
      },
      { 
        id: 2, 
        name: 'Bruschetta Trio', 
        description: 'Three varieties of toasted bread with fresh toppings', 
        price: 10.99,
        image: 'https://www.mpwrestaurants.co.uk/assets/media/images/OFFERS/nyi/Bruchetta-trio-resized.jpg'
      },
      { 
        id: 3, 
        name: 'Buffalo Wings', 
        description: 'Spicy chicken wings with blue cheese dip', 
        price: 14.99,
        image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop&auto=format'
      },
      { 
        id: 4, 
        name: 'Mozzarella Sticks', 
        description: 'Golden fried mozzarella with marinara sauce', 
        price: 9.99,
        image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=400&h=300&fit=crop&auto=format'
      }
    ],
    mains: [
      { 
        id: 5, 
        name: 'Grilled Salmon', 
        description: 'Atlantic salmon with lemon herb butter and vegetables', 
        price: 24.99,
        image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop&auto=format'
      },
      { 
        id: 6, 
        name: 'Ribeye Steak', 
        description: '12oz premium cut with garlic mashed potatoes', 
        price: 32.99,
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&auto=format'
      },
      { 
        id: 7, 
        name: 'Chicken Parmesan', 
        description: 'Breaded chicken breast with marinara and mozzarella', 
        price: 19.99,
        image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=300&fit=crop&auto=format'
      },
      { 
        id: 8, 
        name: 'Vegetarian Pasta', 
        description: 'Penne with roasted vegetables and pesto sauce', 
        price: 16.99,
        image: 'https://www.courtneyssweets.com/wp-content/uploads/2016/11/Easy-Vegetarian-Penne-Pasta-Recipe.jpg'
      },
      { 
        id: 9, 
        name: 'Fish Tacos', 
        description: 'Grilled fish with cabbage slaw and chipotle mayo', 
        price: 18.99,
        image: 'https://natashaskitchen.com/wp-content/uploads/2017/08/Easy-Fish-Tacos-with-the-Best-Fish-Taco-Sauce-4-600x900.jpg'
      },
      { 
        id: 10, 
        name: 'BBQ Ribs', 
        description: 'Fall-off-the-bone ribs with house BBQ sauce', 
        price: 26.99,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop&auto=format'
      }
    ],
    desserts: [
      { 
        id: 11, 
        name: 'Chocolate Lava Cake', 
        description: 'Warm chocolate cake with molten center and vanilla ice cream', 
        price: 8.99,
        image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop&auto=format'
      },
      { 
        id: 12, 
        name: 'Tiramisu', 
        description: 'Classic Italian dessert with coffee and mascarpone', 
        price: 7.99,
        image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop&auto=format'
      },
      { 
        id: 13, 
        name: 'Cheesecake', 
        description: 'New York style with berry compote', 
        price: 6.99,
        image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=300&fit=crop&auto=format'
      },
      { 
        id: 14, 
        name: 'Crème Brûlée', 
        description: 'Rich vanilla custard with caramelized sugar', 
        price: 8.49,
        image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&h=300&fit=crop&auto=format'
      }
    ],
    beverages: [
      { 
        id: 15, 
        name: 'Fresh Lemonade', 
        description: 'Made with fresh lemons and mint', 
        price: 3.99,
        image: 'https://i0.wp.com/thejoyfilledkitchen.com/wp-content/uploads/2021/04/Lemonade-2-2.jpg?resize=740%2C792&ssl=1'
      },
      { 
        id: 16, 
        name: 'Craft Beer', 
        description: 'Selection of local craft beers', 
        price: 5.99,
        image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=300&fit=crop&auto=format'
      },
      { 
        id: 17, 
        name: 'House Wine', 
        description: 'Red or white wine by the glass', 
        price: 7.99,
        image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop&auto=format'
      },
      { 
        id: 18, 
        name: 'Coffee', 
        description: 'Freshly brewed premium coffee', 
        price: 2.99,
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop&auto=format'
      },
      { 
        id: 19, 
        name: 'Fresh Juice', 
        description: 'Orange, apple, or cranberry', 
        price: 4.49,
        image: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400&h=300&fit=crop&auto=format'
      },
      { 
        id: 20, 
        name: 'Iced Tea', 
        description: 'Sweet or unsweetened with lemon', 
        price: 2.49,
        image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop&auto=format'
      }
    ]
  };


  export default menuData