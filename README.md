# friday-suite

### What is friday-suite

Friday-suite is a content management system. Or in other words, it is an environment to load bunch of specially created plugins like [butterscotch](https://github.com/butterscotch-plugins/butterscotch) to achieve something like blogging platform etc.

### What does it do

It basically loads up all the plugins and their themes. Different types of specially designed plugins can be loaded using friday-suite.

### Installation

* Clone and install this repository 

  ```
  git clone git@github.com:FridaySuite/friday-suite.git friday-suite
  cd friday-suite
  npm install
  ```
* After these steps, one needs to install a plugin family like [butterscotch](https://github.com/butterscotch-plugins/butterscotch) which is a blogging platform. For Eg., 

   ```
   git clone git@github.com:butterscotch-plugins/butterscotch.git butterscotch
   cd butterscotch
   npm install
   ```

* After these steps, one needs to install a themes family like [butterscotch-themes](https://github.com/butterscotch-themes/butterscotch) which is a blogging platform themes. For Eg., 

  ```
  git clone git@github.com:butterscotch-themes/butterscotch.git butterscotch-themes
  cd butterscotch-themes
  npm install
  ```

### Executing

From the root directory of friday-suite run

```
npm start -- --plugins-family family-name --themes-family themes-family-name --admin-theme theme-name --main-theme theme-name
 ```