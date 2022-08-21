//*class one [Car]
class Car {
    constructor(brand) {
        //assigning the brand of a car to => this.car_name
        this.car_name = brand;
    }

    //This is a func that return the result 
    present() {
        return "result is" + this.car_name
    }
}

//* I could disp this class here but i extend it in class two
// my_car = new Car("Ford");
// console.log(my_car);


//*Class two [Model]
class Model extends Car {
    constructor(brand, mod) {
        super(brand); //super pass a val to class Car constructor
        this.mod = mod;
    }
    display() {
        return this.present() + ', it is a ' + this.model;
    }
}

//*am passing 2 val one that goes to class Car constructor and the second one to Class Model constructor
my_car = new Model("Ford", "Mustang");
console.log(my_car);