import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from './app.js'

dotenv.config({
    path: './.env'
})


connectDB()
.then(() => {
    app.on("Error",(error)=>{
        console.log("Error",error)
        throw error       
    })
    const port = process.env.PORT || 8000
    app.listen(port,()=>{
        console.log(`⚙️  Server is running at port: ${port}`)
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})