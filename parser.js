function getByTextContent(root, selector) {
  if (selector) {
    return root.querySelector(selector).textContent.trim();
  } else {
    return root.textContent.trim();
  }
}

function getByAttribute(root, attribute, selector) {
  if (selector) {
    return root.querySelector(selector).getAttribute(attribute);
  } else {
    return root.getAttribute(attribute);
  }
}

const buildMeta = (source) => {
  const head = source.head;

  const getTitle = getByTextContent(head, "title").split("—")[0].trim();

  const getDecription = getByAttribute(head, "content", '[name="description"]');

  const getKeywords = getByAttribute(
    head,
    "content",
    '[name="keywords"]',
  ).split(", ");

  const getLanguage = getByAttribute(source, "lang", "html");

  const getOpengraph = (head) => {
    const result = {};
    const properties = head.querySelectorAll('meta[property^="og:"]');
    properties.forEach((property) => {
      let value = getByAttribute(property, "content");
      let key = getByAttribute(property, "property").split(":")[1].trim();
      if (key === "title") {
        value = value.split("—")[0].trim();
      }
      result[key] = value;
    });
    return result;
  };

  return {
    title: getTitle,
    ["description"]: getDecription,
    ["keywords"]: getKeywords,
    language: getLanguage,
    opengraph: getOpengraph(head),
  };
};

const buildProduct = (source) => {
  const product = source.querySelector(".product");
  const getId = product.dataset.id.trim();
  const getName = getByTextContent(product, "h1.title");
  const checkIsLiked = product
    .querySelector('[alt="preview"]')
    .nextElementSibling.classList.contains("active");

  const getTags = (product) => {
    const result = {};
    const tags = [...product.querySelector(".tags").children];
    tags.forEach((tag) => {
      let key;
      let keyFind = (() => {
        if (tag.classList.contains("green")) {
          key = "category";
        } else if (tag.classList.contains("red")) {
          key = "discount";
        } else if (tag.classList.contains("blue")) {
          key = "label";
        }
        return key;
      })();
      let value = getByTextContent(tag);
      if (!result[keyFind]) {
        result[keyFind] = [];
      }
      result[keyFind].push(value);
    });
    return result;
  };

  const prices = getByTextContent(product, ".price").match(/\d+/g);
  const oldPrice = Number(prices[1]);
  const price = Number(prices[0]);

  const discount = oldPrice - price;

  const discountPercent = () => {
    let result;
    if (price < oldPrice) {
      result = `${((discount * 100) / oldPrice).toFixed(2)}%`;
    } else {
      result = "0%";
    }
    return result;
  };

  const getCurrency = (product) => {
    const price = getByTextContent(product, ".price");
    let currency;
    if (price.includes("$")) {
      currency = "USD";
    } else if (price.includes("€")) {
      currency = "EUR";
    } else if (price.includes("₽")) {
      currency = "RUB";
    } else {
      currency = "Валюта не определена";
    }
    return currency;
  };

  const getProperties = (product) => {
    const properties = [...product.querySelector(".properties").children];
    const result = {};
    properties.forEach((property) => {
      let key = property.firstElementChild.textContent;
      let value = property.lastElementChild.textContent;
      result[key] = value;
    });
    return result;
  };

  const getDescription = (product) => {
    const description = product.querySelector(".description").cloneNode(true);
    const descChildrens = [...description.children];
    descChildrens.forEach((child) => {
      while (child.attributes.length > 0) {
        child.removeAttribute(child.attributes[0].name);
      }
    });
    return description.innerHTML.trim();
  };

  const getImages = (product) => {
    const allImages = [...product.querySelectorAll("[data-src]")];
    const result = [];
    allImages.forEach((image) => {
      let imageData = {};
      imageData["preview"] = image.src;
      imageData["full"] = image.dataset.src;
      imageData["alt"] = image.alt;
      result.push(imageData);
    });
    return result;
  };

  return {
    id: getId,
    name: getName,
    isLiked: checkIsLiked,
    tags: getTags(product),
    price: price,
    oldPrice: oldPrice,
    discount: discount,
    discountPercent: discountPercent(),
    currency: getCurrency(product),
    properties: getProperties(product),
    description: getDescription(product),
    images: getImages(product),
  };
};

const buildSuggested = (source) => {
  let suggested = source.querySelector(".suggested");
  const result = [];

  const items = [...suggested.querySelectorAll(".items article")];
  items.forEach((item) => {
    let productInfo = {};
    productInfo["name"] = getByTextContent(item, "h3");
    productInfo["description"] = getByTextContent(item, "p");
    productInfo["image"] = getByAttribute(item, "src", "img");

    const price = getByTextContent(item, "b");
    let valuePrice = price.replace(/[^+\d]/g, "").trim();
    let valueCurrency;
    if (price.includes("$")) {
      valueCurrency = "USD";
    } else if (price.includes("€")) {
      valueCurrency = "EUR";
    } else if (price.includes("₽")) {
      valueCurrency = "RUB";
    } else {
      valuePrice = "Цена не определена";
      valueCurrency = "Валюта не определена";
    }
    productInfo["price"] = valuePrice;
    productInfo["currency"] = valueCurrency;

    result.push(productInfo);
  });

  return result;
};

const buildReviews = (source) => {
  const elementReviews = source.querySelector(".reviews");
  const items = [...elementReviews.querySelectorAll(".items article")];

  const review = [];

  items.forEach((item) => {
    const result = {};

    // Расчёт рейтинга товара по звёздам
    const stars = item.querySelector(".rating").children;
    let starsCount = 0;
    for (let i = 0; i < stars.length; i++) {
      if (stars[i].classList.contains("filled")) {
        starsCount += 1;
      }
    }
    result["rating"] = starsCount;

    // Создание объекта author
    const author = item.querySelector(".author");
    const authorAvatar = getByAttribute(author, "src", "img");
    const authorName = getByTextContent(author, "span");
    result["author"] = {
      avatar: authorAvatar,
      name: authorName,
    };

    // Создание объекта title и description
    const title = item.querySelector(".title");
    result["title"] = getByTextContent(title);
    result["description"] = title.nextElementSibling.textContent.trim();

    // Создание объекта date
    const date = item.querySelector("i");
    result["date"] = date.textContent.replaceAll("/", ".");

    review.push(result);
  });

  return review;
};

function parsePage() {
  return {
    meta: buildMeta(document),
    product: buildProduct(document),
    suggested: buildSuggested(document),
    reviews: buildReviews(document),
  };
}

window.parsePage = parsePage;
