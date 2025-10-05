const Hero=({text})=>{

    return    <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl p-8 md:p-16 shadow-xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ color: '#E35711' }}>
            {text}
          </h1>
           <h3 className="text-4xl md:text-3xl font-bold mb-4" style={{ color: 'black' }}>
            0750 448 98 92
          </h3>
          {/* <p className="text-lg md:text-xl text-gray-600">
            Experience the finest flavors crafted with love and passion...
          </p> */}
        </div>
      </div>
}


export default Hero