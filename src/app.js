const express = require("express");
const mongoose = require("mongoose");
const request = require("postman-request");
const path =require('path')

const port =process.env.PORT || 3000
const publicDirectoryPath= path.join(__dirname,'../public')



const app = express();
app.use(express.static(publicDirectoryPath))
mongoose
  .connect("mongodb://127.0.0.1:27017/crypto", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected");
    fetchData(); // Call fetchData once MongoDB is connected
  })
  .catch((err) => console.log(err));

// Define schema and model
const cryptoSchema = new mongoose.Schema({
  name: String,
  last: Number,
  buy: Number,
  sell: Number,
  volume: Number,
  base_unit: String,
});

const Crypto = mongoose.model("Crypto", cryptoSchema);

// Fetching data
async function fetchData() {
  try {
    request(
      "https://api.wazirx.com/api/v2/tickers",
      async (error, response, body) => {
        if (error) {
          console.error(error);
          return;
        }

        if (response.statusCode !== 200) {
          console.error("Error:", response.statusCode, body);
          return;
        }

        const tickers = JSON.parse(body);

        let count = 0;
        for (let symbol in tickers) {
          if (count >= 10) break;
          const tickerData = tickers[symbol];

          // updating  document in MongoDB
          try {
            await Crypto.findOneAndUpdate(
              { name: symbol },
              {
                name: symbol,
                last: tickerData.last,
                buy: tickerData.buy,
                sell: tickerData.sell,
                volume: tickerData.volume,
                base_unit: tickerData.base_unit,
              },
              { upsert: true, new: true }
            );
            console.log(`Updated ${symbol}`);
          } catch (err) {
            console.error(`Error updating ${symbol}:`, err);
          }

          count++;
        }
      }
    );
  } catch (err) {
    console.error("Error fetching data:", err);
  }
}

//serving the data on server using express

app.get("/api/crypto", async (req, res) => {
  try {
    const data = await Crypto.find({});
    res.json(data);
  } catch (error){

    console.log('Error Fetching data',error)
    res.status(500).json({message : 'internal server error! '})
  }
});



app.listen(port ,()=>{

console.log(`Server is up and running on ${port}`)

})


module.exports=app
