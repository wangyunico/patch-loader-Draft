const path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const PatchDigestPlugin = require('patch-digest-plugin');
module.exports = {
  // click on the name of the option to get to the detailed documentation
  // click on the items with arrows to show more examples / advanced options

  entry: "./example.patch", // string | object | array
  // Here the application starts executing
  // and webpack starts bundling

  output: {
    // options related to how webpack emits results

    path: path.resolve(__dirname, "dist"), // string
    // the target directory for all output files
    // must be an absolute path (use the Node.js path module)

    filename: "bundle.js", // string
    // the filename template for entry chunks
//     library: "LuFix", // string,
//     libraryTarget: "window", // property set to window object
    // the name of the exported library
  },

  module: {
    // configuration regarding modules

    rules: [
      // rules for modules (configure loaders, parser options, etc.)

      {
        test: /\.jsx?$/,
        include: [
          path.resolve(__dirname, "./")
        ],


        loader: "babel-loader",
        // the loader which should be applied, it'll be resolved relative to the context
        // -loader suffix is no longer optional in webpack2 for clarity reasons
        // see webpack 1 upgrade guide

      },

      {
        test: /\.patch$/,
        include: [
          path.resolve(__dirname, "./")
        ],


        loader: "babel-loader!patch-loader",
        // the loader which should be applied, it'll be resolved relative to the context
        // -loader suffix is no longer optional in webpack2 for clarity reasons
        // see webpack 1 upgrade guide

      },
       {
        test: /\.class$/,
         include: [
          path.resolve(__dirname, "./")
        ],
        loader: 'raw-loader!babel-loader!patch-loader'
      }
      // matches if the condition is not matched
    ],
    
    /* Advanced module configuration (click to show) */
  },
    plugins:[new UglifyJSPlugin(),new PatchDigestPlugin()]
  // plugins:[new HtmlWebpackPlugin()]
  /* Advanced configuration (click to show) */
}
