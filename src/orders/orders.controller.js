const path = require("path");
// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));
// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");
// TODO: Implement the /orders handlers needed to make the tests pass

function orderExists(req, res, next) {
  var orderId = req.params.orderId;
  res.locals.orderId = orderId;
  var foundOrder = orders.find((order) => order.id === orderId);
  if (!foundOrder) {
    return next({
      status: 404,
      message: `Order not found: ${orderId}`,
    });
  }
  res.locals.order = foundOrder;
}

function orderValidDeliverTo(req, res, next) {
  var { data = null } = req.body;
  res.locals.newOD = data;
  var orderdeliverTo = data.deliverTo;
  if (!orderdeliverTo || orderdeliverTo.length === 0) {
    return next({
      status: 400,
      message: "Order must include a deliverTo",
    });
  }
}

function orderHasValidMobileNumber(req, res, next) {
  var orderMobileNumber = res.locals.newOD.mobileNumber;
  if (!orderMobileNumber || orderMobileNumber.length === 0) {
    return next({
      status: 400,
      message: "Order must include a mobileNumber",
    });
  }
}

function orderHasDishes(req, res, next) {
  var orderDishes = res.locals.newOD.dishes;
  if (!orderDishes || !Array.isArray(orderDishes) || orderDishes.length <= 0) {
    return next({
      status: 400,
      message: "Order must include at least one dish",
    });
  }
  res.locals.dishes = orderDishes;
}

function orderHasValidDishes(req, res, next) {
  var orderDishes = res.locals.dishes;
  orderDishes.forEach((dish) => {
    var dishQuantity = dish.quantity;
    if (!dishQuantity || typeof dishQuantity != "number" || dishQuantity <= 0) {
      return next({
        status: 400,
        message: `Dish ${orderDishes.indexOf(
          dish
        )} must have a quantity that is an integer greater than 0`,
      });
    }
  });
}

function orderIdMatches(req, res, next) {
  var paramId = res.locals.orderId;
  var { id = null } = res.locals.newOD;
  if (!id || id === null) {
    res.locals.newOD.id = res.locals.orderId;
  } else if (paramId != id) {
    return next({
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${paramId}`,
    });
  }
}

function incomingStatusIsValid(req, res, next) {
  var { status = null } = res.locals.newOD;
  if (!status || status.length === 0 || status === "invalid") {
    return next({
      status: 400,
      message:
        "Order must have a status of pending, preparing, out-for-delivery, delivered",
    });
  }
}

function extantStatusIsValid(req, res, next) {
  var { status = null } = res.locals.order;
  if (status === "delivered") {
    return next({
      status: 400,
      message: "A delivered order cannot be changed",
    });
  }
}

function extantStatusIsPending(req, res, next) {
  var { status = null } = res.locals.order;
  if (status !== "pending") {
    return next({
      status: 400,
      message: "An order cannot be deleted unless it is pending",
    });
  }
}

function createValidation(req, res, next) {
  orderValidDeliverTo(req, res, next);
  orderHasValidMobileNumber(req, res, next);
  orderHasDishes(req, res, next);
  orderHasValidDishes(req, res, next);
  next();
}

function readValidation(req, res, next) {
  orderExists(req, res, next);
  next();
}

function updateValidation(req, res, next) {
  orderExists(req, res, next);
  orderValidDeliverTo(req, res, next);
  orderHasValidMobileNumber(req, res, next);
  orderHasDishes(req, res, next);
  orderHasValidDishes(req, res, next);
  orderIdMatches(req, res, next);
  incomingStatusIsValid(req, res, next);
  extantStatusIsValid(req, res, next);
  next();
}

function deleteValidation(req, res, next) {
  orderExists(req, res, next);
  extantStatusIsPending(req, res, next);
  next();
}

function create(req, res) {
  var newOrderData = res.locals.newOD;
  newOrderData.id = nextId();
  orders.push(newOrderData);
  res.status(201).json({ data: newOrderData });
}

function read(req, res) {
  res.status(200).json({ data: res.locals.order });
}

function update(req, res) {
  var newData = res.locals.newOD;
  var oldData = res.locals.order;
  var index = orders.indexOf(oldData);
  for (var key in newData) {
    orders[index][key] = newData[key];
  }
  res.status(200).json({ data: orders[index] });
}

function list(req, res) {
  res.status(200).json({ data: orders });
}

function destroy(req, res) {
  var index = orders.indexOf(res.locals.order);
  orders.splice(index, 1);
  res.sendStatus(204);
}

module.exports = {
  create: [createValidation, create],
  read: [readValidation, read],
  update: [updateValidation, update],
  delete: [deleteValidation, destroy],
  list,
};
