
Number.prototype.formatMoney = function (c, d, t) {
  var n = this,
    c = isNaN(c = Math.abs(c)) ? 2 : c,
    d = d == undefined ? "," : d,
    t = t == undefined ? "." : t,
    s = n < 0 ? "-" : "",
    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
    j = (j = i.length) > 3 ? j % 3 : 0;
  return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};

module.exports = {

  moneyFormat: function (num) {
    num = num.toString();
    if (num === '') {
      num = '$0.00';
    } else if (!num.search('$')) {
      num = "$" + parseFloat(num).formatMoney(2, '.', ',');
    } else {
      num = "$" + parseFloat(num.replace(/[^\d\.-]/g, '')).formatMoney(0, '.', ',');
    }
    return num;
  },

  unMoneyFormat: function (amount) {
    return Number(amount.replace(/[^0-9.-]+/g, '')).toFixed(0);
  },

  capitalize: (string) => {
    var capital = ''
    var words = string.split(' ')
    words.forEach((str) => {
      var word = str.charAt(0).toUpperCase() + str.slice(1)
      var capitalWord = word.concat(' ')
      capital += capitalWord
    })
    return capital
  },
}
