const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema } = require("./schema.js");


const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

// DB connection
mongoose
  .connect(MONGO_URL)
  .then(() => console.log("connected to DB"))
  .catch((err) => console.log(err));

// EJS setup
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));


//JOI function
const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body);

  if (error) {
    const errMsg = error.details.map(el => el.message).join(",");
    throw new ExpressError(400, errMsg);
  }

  next();
};

// Routes
app.get("/", (req, res) => {
  res.send("Hii! I am the root");
});

// INDEX
app.get("/listings", async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings });
});

// NEW
app.get("/listings/new", (req, res) => {
  res.render("listings/new");
});

// SHOW
app.get("/listings/:id", 
  wrapAsync (async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  res.render("listings/show", { listing });
})
);

// CREATE
app.post(
  "/listings",
  validateListing,
  wrapAsync(async (req, res) => {
    const listingData = req.body.listing;

    // ✅ image optional
    if (listingData.image && listingData.image.url && listingData.image.url.trim() !== "") {
      listingData.image = {
        filename: "listingimage",
        url: listingData.image.url
      };
    } else {
      // ❌ remove image completely
      delete listingData.image;
    }

    const newListing = new Listing(listingData);
    await newListing.save();

    res.redirect("/listings");
  })
);



// EDIT
app.get("/listings/:id/edit", 
  wrapAsync (async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  res.render("listings/edit", { listing });
})
);

// // UPDATE
// app.put("/listings/:id", 
//   validateListing,
//   wrapAsync (async (req, res) => {

//   const listingData = req.body.listing;
//   listingData.image = {
//     filename: "listingimage",
//     url: listingData.image
//   };

//   await Listing.findByIdAndUpdate(req.params.id, listingData);
//   res.redirect(`/listings/${req.params.id}`);
// })
// );


// UPDATE
app.put(
  "/listings/:id",
  validateListing,
  wrapAsync(async (req, res) => {

    const { id } = req.params;
    const listingData = req.body.listing;

    // ✅ image is optional
    if (
      listingData.image &&
      listingData.image.url &&
      listingData.image.url.trim() !== ""
    ) {
      listingData.image = {
        filename: "listingimage",
        url: listingData.image.url
      };
    } else {
      // ❌ if empty, remove image field
      delete listingData.image;
    }

    await Listing.findByIdAndUpdate(
      id,
      listingData,
      { runValidators: true }
    );

    res.redirect(`/listings/${id}`);
  })
);

// DELETE
app.delete("/listings/:id", async (req, res) => {
  await Listing.findByIdAndDelete(req.params.id);
  res.redirect("/listings");
});

// 404 handler — NO app.all
app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) =>{
  let{statusCode = 500, message= "Something went wrong"} = err;
  res.render("error.ejs", {message});
  // res.status(statusCode).send(message);
});


// Server
app.listen(8080, () => {
  console.log("server is listening on port 8080");
});
